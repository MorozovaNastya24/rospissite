/* Apply the persisted theme before paint; respect OS preference on first visit. */
try {
 const preference=localStorage.getItem('rospisi-theme');
 document.documentElement.dataset.theme=preference==='dark'||preference==='light'?preference:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
} catch { document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'; }
