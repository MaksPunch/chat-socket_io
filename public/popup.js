import { createPopup } from 'https://unpkg.com/@picmo/popup-picker@latest/dist/index.js?module';

const text = document.querySelector('#input');
const trigger = document.querySelector('#trigger');

const picker = createPopup({}, {
  referenceElement: trigger,
  triggerElement: trigger,
  position: 'right-end'
});

trigger.addEventListener('click', () => {
  picker.toggle();
});

picker.addEventListener('emoji:select', (selection) => {
  text.value += selection.emoji;
});