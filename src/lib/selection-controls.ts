export interface SelectionOption {
  value: string;
  label: string;
}

interface SwitchConfig {
  id?: string;
  options: SelectionOption[];
  active?: string;
  size?: 'small' | 'default';
  ariaLabel?: string;
  className?: string;
}

interface DropdownConfig {
  id?: string;
  options: SelectionOption[];
  active?: string;
  ariaLabel?: string;
  className?: string;
}

const ICON_SVGS = {
  check: '<svg class="icon selection-dropdown__option-check" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56A8,8,0,0,1,45.66,138.34L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/></svg>',
  'caret-down': '<svg class="icon selection-dropdown__chevron" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z"/></svg>',
};

function dispatchChange(container: HTMLElement, value: string, element: HTMLElement) {
  container.dispatchEvent(new CustomEvent('change', {
    bubbles: true,
    detail: { value, element },
  }));
}

function setupSwitchOverflow(container: HTMLElement) {
  const parent = container.parentElement;
  if (parent && parent.classList.contains('selection-switch-wrap')) return;

  const wrap = document.createElement('div');
  wrap.className = 'selection-switch-wrap';
  if (parent) parent.insertBefore(wrap, container);
  wrap.appendChild(container);

  const caretDownSvg = '<svg class="icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z"/></svg>';

  const makeChevron = (direction: 'prev' | 'next') => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `selection-switch-chevron selection-switch-chevron--${direction}`;
    btn.setAttribute('aria-label', direction === 'next' ? 'Scroll right' : 'Scroll left');
    btn.disabled = true;
    btn.setAttribute('aria-hidden', 'true');
    btn.innerHTML = caretDownSvg;
    return btn;
  };

  const prev = makeChevron('prev');
  const next = makeChevron('next');
  wrap.append(prev, next);

  const getMaxScroll = () => Math.max(0, container.scrollWidth - container.clientWidth);
  const clampScroll = (x: number) => Math.max(0, Math.min(x, getMaxScroll()));

  const update = () => {
    const max = getMaxScroll();
    const x = clampScroll(container.scrollLeft);
    const showPrev = x > 1;
    const showNext = x < max - 1;
    prev.classList.toggle('is-visible', showPrev);
    next.classList.toggle('is-visible', showNext);
    prev.disabled = !showPrev;
    next.disabled = !showNext;
    prev.setAttribute('aria-hidden', String(!showPrev));
    next.setAttribute('aria-hidden', String(!showNext));
    wrap.classList.toggle('has-prev', showPrev);
    wrap.classList.toggle('has-next', showNext);
  };

  const scrollByPage = (direction: 'prev' | 'next') => {
    const chevronSpace = next.offsetWidth * 2;
    const distance = Math.max(container.clientWidth - chevronSpace, container.clientWidth / 2);
    const delta = direction === 'next' ? distance : -distance;
    container.scrollTo({ left: clampScroll(container.scrollLeft + delta), behavior: 'smooth' });
  };

  prev.addEventListener('click', () => scrollByPage('prev'));
  next.addEventListener('click', () => scrollByPage('next'));

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  };

  container.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(schedule).observe(container);
  }
  schedule();
}

export function initSelectionSwitch(container: HTMLElement) {
  if (container.dataset.switchInitialized === 'true') return;
  container.dataset.switchInitialized = 'true';

  const options = Array.from(container.querySelectorAll<HTMLElement>('.switch-option'));
  options.forEach((option) => {
    option.addEventListener('click', () => {
      options.forEach((other) => other.classList.remove('active'));
      option.classList.add('active');
      dispatchChange(container, option.dataset.value || option.id, option);
    });
  });

  setupSwitchOverflow(container);
}

export function createSelectionSwitch(config: SwitchConfig): HTMLElement {
  const el = document.createElement('div');
  el.className = [
    'selection-switch',
    config.size === 'small' && 'selection-switch--small',
    config.className,
  ].filter(Boolean).join(' ');
  if (config.id) el.id = config.id;
  if (config.ariaLabel) el.setAttribute('aria-label', config.ariaLabel);
  el.dataset.selectionSwitch = '';

  const active = config.active ?? config.options[0]?.value;
  config.options.forEach((opt) => {
    const span = document.createElement('span');
    span.className = 'switch-option' + (opt.value === active ? ' active' : '');
    span.dataset.value = opt.value;
    span.textContent = opt.label;
    el.appendChild(span);
  });

  initSelectionSwitch(el);
  return el.parentElement && el.parentElement.classList.contains('selection-switch-wrap')
    ? el.parentElement
    : el;
}

export function initSelectionDropdown(container: HTMLElement) {
  if (container.dataset.dropdownInitialized === 'true') return;

  const trigger = container.querySelector<HTMLButtonElement>('.selection-dropdown__trigger');
  const triggerText = container.querySelector<HTMLElement>('.selection-dropdown__trigger-text');
  const menu = container.querySelector<HTMLElement>('.selection-dropdown__menu');
  const options = Array.from(container.querySelectorAll<HTMLElement>('.selection-dropdown__option'));
  if (!trigger || !triggerText || !menu || options.length === 0) return;

  const triggerEl = trigger;
  const triggerTextEl = triggerText;
  const menuEl = menu;

  function setActive(value: string, shouldDispatch: boolean) {
    const activeOption = options.find((opt) => opt.dataset.value === value);
    if (!activeOption) return;

    options.forEach((opt) => {
      const isActive = opt === activeOption;
      opt.classList.toggle('active', isActive);
      opt.setAttribute('aria-selected', String(isActive));
    });
    const label = activeOption.querySelector('.selection-dropdown__option-label');
    triggerTextEl.textContent = (label || activeOption).textContent;
    if (shouldDispatch) dispatchChange(container, value, activeOption);
  }

  function setOpen(open: boolean) {
    menuEl.classList.toggle('collapsed', !open);
    triggerEl.setAttribute('aria-expanded', String(open));
  }

  const initial = options.find((opt) => opt.classList.contains('active')) || options[0];
  setActive(initial.dataset.value || '', false);
  setOpen(false);

  triggerEl.addEventListener('click', () => {
    setOpen(triggerEl.getAttribute('aria-expanded') !== 'true');
  });

  options.forEach((option) => {
    option.addEventListener('click', () => {
      setActive(option.dataset.value || '', true);
      setOpen(false);
    });
  });

  document.addEventListener('click', (event) => {
    if (!container.contains(event.target as Node)) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });

  container.dataset.dropdownInitialized = 'true';
}

export function createSelectionDropdown(config: DropdownConfig): HTMLElement {
  const el = document.createElement('div');
  el.className = ['selection-dropdown', config.className].filter(Boolean).join(' ');
  if (config.id) el.id = config.id;
  el.dataset.selectionDropdown = '';
  if (config.ariaLabel) el.setAttribute('aria-label', config.ariaLabel);

  const active = config.active ?? config.options[0]?.value;
  const trigger = document.createElement('button');
  trigger.className = 'selection-dropdown__trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const triggerText = document.createElement('span');
  triggerText.className = 'selection-dropdown__trigger-text';
  trigger.append(triggerText);
  trigger.insertAdjacentHTML('beforeend', ICON_SVGS['caret-down']);

  const menu = document.createElement('div');
  menu.className = 'selection-dropdown__menu collapsed';
  menu.setAttribute('role', 'listbox');

  config.options.forEach((opt) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'selection-dropdown__option' + (opt.value === active ? ' active' : '');
    option.dataset.value = opt.value;
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(opt.value === active));

    const label = document.createElement('span');
    label.className = 'selection-dropdown__option-label';
    label.textContent = opt.label;

    option.append(label);
    option.insertAdjacentHTML('beforeend', ICON_SVGS.check);
    menu.appendChild(option);
  });

  el.append(trigger, menu);
  initSelectionDropdown(el);
  return el;
}

export function initSelectionControls(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-selection-switch]').forEach(initSelectionSwitch);
  root.querySelectorAll<HTMLElement>('[data-selection-dropdown]').forEach(initSelectionDropdown);
}
