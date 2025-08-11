/* Oz Cleanse Companion — app.js (patched)
   - Fix: calendar now shows 4 juices per *day* (expands phase to DayPlans)
   - Fix: Smart Coach renders a tidy list (not bunched text)
   - Add: Splash hide trigger + 100% day affirmation (toast + confetti)
   - Compatible with index.html + style.css from this thread
   - Uses React 18 UMD globals (no bundler required)
*/

(function () {
  const React = window.React;
  const ReactDOM = window.ReactDOM;
  const { useEffect, useMemo, useState } = React;

  // -----------------------------
  // Utilities: Dates & Expansion
  // -----------------------------
  const iso = (d) => new Date(d).toISOString().slice(0, 10);
  function addDays(date, n) {
    const d = new Date(date); d.setDate(d.getDate() + n); return d;
  }
  function eachDay(startDate, endDate) {
    const out = []; const cur = new Date(startDate); const end = new Date(endDate);
    while (cur <= end) { out.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    return out;
  }

  // Daily template for the cleanse phase — 4 juices/day (1 each)
  const CLEANSE_DAILY_TEMPLATE = [
    { recipeId: 'green',  servings: 1, label: 'Green Juice' },
    { recipeId: 'carrot', servings: 1, label: 'Carrot-Apple' },
    { recipeId: 'beet',   servings: 1, label: 'Beet-Citrus' },
    { recipeId: 'citrus', servings: 1, label: 'Citrus-Ginger' },
  ];

  function expandPhaseToDays(phase) {
    const days = eachDay(phase.startDate, phase.endDate);
    if (phase.type === 'cleanse') {
      return days.map((date) => ({
        date: iso(date),
        phaseType: 'cleanse',
        entries: CLEANSE_DAILY_TEMPLATE.map((e, i) => ({
          ...e,
          id: `${iso(date)}:${e.recipeId}:${i}`,
          completed: false,
        })),
        _celebrated: false,
      }));
    }
    if (phase.type === 'fast') {
      return days.map((date) => ({ date: iso(date), phaseType: 'fast', entries: [], _celebrated: false }));
    }
    if (phase.type === 'rebuild') {
      return days.map((date) => ({
        date: iso(date),
        phaseType: 'rebuild',
        entries: [],
        _celebrated: false,
      }));
    }
    return [];
  }

  function buildProgramDayPlans(program) {
    const all = [];
    for (const p of program.phases || []) {
      all.push(...expandPhaseToDays(p));
    }
    all.sort((a, b) => a.date.localeCompare(b.date));
    return all;
  }

  // -----------------------------
  // UI Helpers
  // -----------------------------
  function celebrate100(msg = "100% day — you crushed it!") {
    try {
      // toast
      const node = document.createElement('div');
      node.className = 'card';
      node.style.position = 'fixed';
      node.style.left = '50%';
      node.style.bottom = '80px';
      node.style.transform = 'translateX(-50%)';
      node.style.zIndex = '120';
      node.style.padding = '12px 16px';
      node.style.boxShadow = '0 16px 34px rgba(236,72,153,.18)';
      node.textContent = msg;
      document.body.appendChild(node);
      setTimeout(() => node.remove(), 2800);

      // confetti (canvas-confetti provided by index.html)
      if (window.confetti) {
        window.confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
        setTimeout(() => window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.75 } }), 250);
      }
    } catch (_) {}
  }

  // Compute compliance as completed/total for a day
  function complianceOf(day) {
    const total = day.entries.length || 1;
    const done = day.entries.filter(e => e.completed).length;
    return done / total;
  }

  // -----------------------------
  // Components
  // -----------------------------
  function SmartCoach({ advice }) {
    const lines = useMemo(() => (
      Array.isArray(advice) ? advice
        : String(advice || '').split(/\r?\n|(?<=\.)\s+(?=[A-Z])/).filter(Boolean)
    ), [advice]);

    return (
      React.createElement('div', { className: 'coachCard' },
        React.createElement('strong', null, 'Smart Coach'),
        React.createElement('div', { className: 'coachOut' },
          React.createElement('ul', { style: { margin: '6px 0 0', padding: '0 0 0 18px' }},
            lines.map((line, i) => React.createElement('li', { key: i }, line))
          )
        )
      )
    );
  }

  function CalendarDay({ day, onToggle }) {
    return (
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'row center', style: { justifyContent: 'space-between' } },
          React.createElement('strong', null, day.date),
          React.createElement('span', { className: 'badge' }, day.phaseType.charAt(0).toUpperCase() + day.phaseType.slice(1))
        ),
        React.createElement('ul', { style: { margin: '8px 0 0 0', padding: '0 0 0 18px' } },
          day.entries.map(item => (
            React.createElement('li', { key: item.id },
              React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: !!item.completed,
                  onChange: () => onToggle(day.date, item.id)
                }),
                `${item.servings}× ${item.label || item.recipeId}`
              )
            )
          ))
        ),
        React.createElement('div', { className: 'prog', style: { marginTop: 10 } },
          React.createElement('i', { style: { width: `${Math.round(complianceOf(day) * 100)}%` } })
        )
      )
    );
  }

  function Calendar({ days, onToggle }) {
    return (
      React.createElement('div', { className: 'grid grid-2' },
        days.map(d => React.createElement(CalendarDay, { key: d.date, day: d, onToggle }))
      )
    );
  }

  function App() {
    // Use provided global PROGRAM if present, else build a demo
    const program = useMemo(() => {
      if (window.PROGRAM && Array.isArray(window.PROGRAM.phases)) return window.PROGRAM;
      // Demo: today start, 4-day cleanse
      const start = new Date();
      const end = addDays(start, 3);
      return { id: 'demo', name: 'Demo Cleanse', startDate: iso(start), phases: [
        { type: 'cleanse', startDate: iso(start), endDate: iso(end) }
      ]};
    }, []);

    const [days, setDays] = useState(() => buildProgramDayPlans(program));

    // Example Smart Coach advice (replace with real logic)
    const advice = useMemo(() => {
      const doneToday = days.find(d => d.date === iso(new Date()));
      const pct = doneToday ? Math.round(complianceOf(doneToday) * 100) : 0;
      const lines = [];
      if (pct < 100) lines.push(`You're at ${pct}% of today's checklist. Aim for 100%.`);
      lines.push('Target 80–100 oz water. Log LMNT if you haven’t.');
      lines.push('Add a 15–20 min walk to boost circulation.');
      return lines;
    }, [days]);

    function handleToggle(dayISO, entryId) {
      setDays(prev => prev.map(d => {
        if (d.date !== dayISO) return d;
        const entries = d.entries.map(e => e.id === entryId ? { ...e, completed: !e.completed } : e);
        const next = { ...d, entries };
        // Celebrate on crossing to 100%
        if (!next._celebrated && complianceOf(next) >= 1) {
          celebrate100('Day completed — nice work!');
          next._celebrated = true;
        }
        return next;
      }));
    }

    useEffect(() => {
      // App is mounted -> hide splash immediately
      document.dispatchEvent(new Event('oz:ready'));
    }, []);

    return (
      React.createElement('div', { className: 'grid', style: { gap: 18 } },
        // Mast (simple)
        React.createElement('div', { className: 'mast' },
          React.createElement('div', { className: 'left' },
            React.createElement('img', { src: 'oz.png', alt: 'Oz' }),
            React.createElement('div', null,
              React.createElement('h1', null, 'Oz Cleanse Companion'),
              React.createElement('div', { className: 'phase' }, 'Cleanse Phase')
            )
          ),
          React.createElement('div', { className: 'day-nav' },
            React.createElement('span', { className: 'day-chip on' }, 'Today')
          )
        ),

        React.createElement(SmartCoach, { advice }),
        React.createElement(Calendar, { days, onToggle: handleToggle }),

        // Bottom tabs (placeholder)
        React.createElement('div', { className: 'tabs safe-bottom' },
          React.createElement('button', { className: 'btn' }, 'Today'),
          React.createElement('button', { className: 'btn primary' }, 'Calendar'),
          React.createElement('button', { className: 'btn' }, 'Recipes')
        )
      )
    );
  }

  // -----------------------------
  // Mount
  // -----------------------------
  const rootEl = document.getElementById('root');
  const root = ReactDOM.createRoot(rootEl);
  root.render(React.createElement(React.StrictMode, null, React.createElement(App)));

  // Also dispatch once more in case someone copies this file into a project
  document.dispatchEvent(new Event('oz:ready'));
})();
