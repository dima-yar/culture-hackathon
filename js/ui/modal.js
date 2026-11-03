/**
 * Single modal dialog. Clicking the backdrop closes it.
 */

const getModal = () => document.getElementById('modal');

/** Opens the modal with the given (already escaped) HTML and returns the dialog element. */
export function openModal(html) {
  const modal = getModal();
  modal.innerHTML = `<div class="modal__dialog" role="dialog" aria-modal="true">${html}</div>`;
  modal.hidden = false;
  return modal.firstElementChild;
}

export function closeModal() {
  getModal().hidden = true;
}

export function initModal() {
  getModal().addEventListener('click', event => {
    if (event.target === getModal()) closeModal();
  });
}
