/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: 'var(--color-sidebar)',
        'sidebar-hover': 'var(--color-sidebar-hover)',
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        background: 'var(--color-background)',
        card: 'var(--color-card)',
        navbar: 'var(--color-navbar)',
        heading: 'var(--color-heading)',
        body: 'var(--color-body)',
        border: 'var(--color-border)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
        'primary-tint': 'var(--color-primary-tint)',
        'success-tint': 'var(--color-success-tint)',
        'warning-tint': 'var(--color-warning-tint)',
        'danger-tint': 'var(--color-danger-tint)',
        'info-tint': 'var(--color-info-tint)',
        'card-soft': 'var(--color-card-soft)',
        'card-muted': 'var(--color-card-muted)',
        'card-dim': 'var(--color-card-dim)',
        'body-muted': 'var(--color-body-muted)',
        'background-muted': 'var(--color-background-muted)',
        overlay: 'var(--color-overlay)',
      },
      boxShadow: {
        panel: '0 18px 45px -24px rgba(15, 23, 42, 0.24)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'app-grid':
          'radial-gradient(circle at top, var(--color-primary-tint), transparent 40%), linear-gradient(135deg, rgba(255,255,255,0.6), transparent)',
      },
    },
  },
  plugins: [],
};
