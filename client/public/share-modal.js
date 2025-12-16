// Share-modal.js
// Defensive, safe DOM wiring for share modal. Won't throw if elements are absent.

(function () {
  'use strict';

  function safe(selector) {
    try {
      return document.querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onReady(function init() {
    const openBtns = document.querySelectorAll('[data-open-share]') || [];
    const closeBtns = document.querySelectorAll('[data-close-share]') || [];
    const modals = document.querySelectorAll('#share-modal') || [];
    const copyBtns = document.querySelectorAll('[data-copy-link]') || [];

    if (
      openBtns.length === 0 &&
      closeBtns.length === 0 &&
      modals.length === 0 &&
      copyBtns.length === 0
    ) {
      // Nothing to wire up on this page
      return;
    }

    // Open handlers: each button should open its nearest modal or the first #share-modal
    openBtns.forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = btn.getAttribute('data-target') || '#share-modal';
        const modal =
          document.querySelector(targetId) ||
          document.querySelector('#share-modal');
        if (!modal) return;
        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');
      });
    });

    // Close handlers
    closeBtns.forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        // find closest modal ancestor if any
        const modal =
          btn.closest('#share-modal') || document.querySelector('#share-modal');
        if (!modal) return;
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
      });
    });

    // Copy link handlers
    copyBtns.forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        // try to find an input or element inside same modal
        const modal =
          btn.closest('#share-modal') || document.querySelector('#share-modal');
        if (!modal) {
          // fallback to global #share-link
          const fallback = safe('#share-link');
          const val = fallback
            ? fallback.value || fallback.textContent || fallback.innerText || ''
            : '';
          if (!val) {
            alert('No link to copy');
            return;
          }
          copyToClipboard(val, btn);
          return;
        }

        const linkInput =
          modal.querySelector('#share-link') ||
          modal.querySelector('[data-share-link]');
        const val = linkInput
          ? linkInput.value ||
            linkInput.textContent ||
            linkInput.innerText ||
            ''
          : '';
        if (!val) {
          alert('No link to copy');
          return;
        }
        copyToClipboard(val, btn);
      });
    });

    // Modal overlay close (if overlay exists inside modal)
    modals.forEach((modal) => {
      const overlay = modal.querySelector('.overlay');
      if (overlay) {
        overlay.addEventListener('click', function () {
          modal.style.display = 'none';
          modal.setAttribute('aria-hidden', 'true');
        });
      }
    });

    // Utility to copy and provide feedback
    function copyToClipboard(text, btn) {
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () {
            flashButton(btn, 'Copied');
          },
          function () {
            fallbackCopy(text, btn);
          }
        );
      } else {
        fallbackCopy(text, btn);
      }
    }

    function fallbackCopy(text, btn) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('aria-hidden', 'true');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        // defensive: only remove if still attached
        if (ta.parentNode) document.body.removeChild(ta);
        flashButton(btn, 'Copied');
      } catch (e) {
        alert('Could not copy link. Please copy manually: ' + text);
      }
    }

    function flashButton(btn, label) {
      if (!btn) return;
      const prev = btn.textContent;
      btn.textContent = label || 'Copied';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = prev;
        btn.disabled = false;
      }, 1400);
    }
  });
})();
