// client/src/components/Share-modal.js
// Safe DOM-ready bindings for share modal interactions.
// Ensure HTML contains #shareBtn, #shareModal, #shareModalClose (or adjust selectors).

document.addEventListener('DOMContentLoaded', () => {
  try {
    const shareBtn = document.getElementById('shareBtn');
    const modal = document.getElementById('shareModal');
    const closeBtn = document.getElementById('shareModalClose');

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (!modal) return;
        modal.style.display = 'block';
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (!modal) return;
        modal.style.display = 'none';
      });
    }

    // close modal when clicking outside
    window.addEventListener('click', (e) => {
      if (!modal) return;
      if (e.target === modal) modal.style.display = 'none';
    });
  } catch (err) {
    // fail silently in production; log in dev if needed
    // console.error('share-modal init error', err);
  }
});
