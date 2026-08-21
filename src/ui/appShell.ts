import { initialNeighborhoodState, reduceNeighborhoodState, type NeighborhoodState, type WebglStatus } from '../application/state';
import { ENTITY_PRESENTATION } from '../data/entities';
import type { AtlasScopeId, NeighborhoodEntity } from '../data/schema';
import { ROUTE_LEGEND_COPY, createAtlasViewModel, type AtlasViewModel, type RelationshipItem } from './presentation';

export interface AppShellOptions {
  onSelect: (id: string) => void;
  onOverview: () => void;
  onScope?: (scopeId: AtlasScopeId) => void;
  onBack?: () => void;
  onPreview?: (id: string | null) => void;
  onRelationship?: (relationship: RelationshipItem) => void;
  onRetry?: () => void;
  onReducedMotionChange?: (reduced: boolean) => void;
  onDetailDisclosureChange?: (expanded: boolean) => void;
  onLegendDisclosureChange?: (expanded: boolean) => void;
  compactMedia?: Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>;
}

export interface SafeInsetsMeasurement {
  insets: { top: number; right: number; bottom: number; left: number };
  rectangles: readonly { top: number; right: number; bottom: number; left: number }[];
}

export interface AppShell {
  element: HTMLElement;
  navigator: HTMLElement;
  card: HTMLElement;
  render: (state: NeighborhoodState, viewModel: AtlasViewModel) => void;
  measureSafeInsets: () => SafeInsetsMeasurement;
  setStatus: (status: WebglStatus) => void;
  setSelected: (id: string | null) => void;
  setWebGLStatus: (status: 'ready' | 'failed') => void;
  setReducedMotion: (reduced: boolean) => void;
  dispose: () => void;
}

let shellSequence = 0;

function textElement<K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches('input, textarea, select')
    || Boolean(target.closest('[contenteditable]:not([contenteditable=false])'));
}

function reduceMotionIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('atlas-header__icon');
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('cx', '5'); dot.setAttribute('cy', '12'); dot.setAttribute('r', '2.5');
  svg.append(dot);
  for (const [x1, y1, x2, y2] of [[13, 5, 21, 5], [10, 12, 21, 12], [13, 19, 21, 19]]) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x1)); line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2)); line.setAttribute('y2', String(y2));
    svg.append(line);
  }
  return svg;
}

export function createAppShell(root: HTMLElement, entities: readonly NeighborhoodEntity[], options: AppShellOptions): AppShell {
  const shellId = shellSequence++;
  const element = document.createElement('div');
  element.className = 'app-shell';

  const header = document.createElement('header');
  header.className = 'atlas-header ui-panel';
  header.dataset.safeRegion = '';
  header.append(textElement('h1', 'Semantic Institutional Atlas', 'atlas-header__title visually-hidden'));
  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'atlas-breadcrumb';
  breadcrumb.setAttribute('aria-label', 'Breadcrumb');
  const breadcrumbList = document.createElement('ol');
  breadcrumb.append(breadcrumbList);
  const globalActions = document.createElement('div');
  globalActions.className = 'atlas-header__actions';
  const overviewButton = textElement('button', 'Overview');
  overviewButton.type = 'button'; overviewButton.dataset.overview = '';
  const reducedMotionButton = document.createElement('button');
  reducedMotionButton.type = 'button'; reducedMotionButton.dataset.reducedMotion = '';
  reducedMotionButton.className = 'atlas-header__icon-toggle';
  reducedMotionButton.setAttribute('aria-label', 'Reduce Motion');
  reducedMotionButton.setAttribute('aria-pressed', 'false');
  reducedMotionButton.append(reduceMotionIcon());
  globalActions.append(overviewButton, reducedMotionButton);
  header.append(breadcrumb, globalActions);

  const explorerToggle = textElement('button', 'Explore Organizations', 'explorer-toggle ui-panel');
  explorerToggle.type = 'button'; explorerToggle.dataset.explorerToggle = '';
  explorerToggle.setAttribute('aria-expanded', 'true');
  explorerToggle.setAttribute('aria-controls', 'organization-explorer');

  const navigator = document.createElement('nav');
  navigator.id = 'organization-explorer';
  navigator.className = 'organization-nav ui-panel';
  navigator.dataset.safeRegion = '';
  navigator.setAttribute('aria-label', 'Organization');
  navigator.tabIndex = -1;

  const detailToggle = textElement('button', 'Show Details', 'detail-toggle ui-panel');
  detailToggle.type = 'button'; detailToggle.dataset.detailToggle = '';
  detailToggle.hidden = true;
  detailToggle.setAttribute('aria-expanded', 'false');
  const card = document.createElement('article');
  card.id = `entity-detail-${shellId}`;
  card.className = 'entity-card ui-panel';
  card.dataset.detail = '';
  card.dataset.safeRegion = '';
  card.setAttribute('aria-live', 'polite');
  card.hidden = true;
  detailToggle.setAttribute('aria-controls', card.id);

  const legendDisclosure = document.createElement('section');
  legendDisclosure.className = 'route-legend';
  legendDisclosure.dataset.safeRegion = '';
  const legendButton = textElement('button', 'Legend', 'route-legend__toggle');
  legendButton.type = 'button'; legendButton.dataset.legendToggle = '';
  legendButton.setAttribute('aria-expanded', 'false');
  const legend = document.createElement('div');
  legend.id = `route-legend-${shellId}`;
  legend.dataset.legend = '';
  legend.hidden = true;
  legendButton.setAttribute('aria-controls', legend.id);
  legend.append(textElement('h2', 'Connection Types', 'route-legend__title'));
  for (const entry of ROUTE_LEGEND_COPY) {
    const row = textElement('p', entry.label);
    row.dataset.routeKind = entry.kind;
    legend.append(row);
  }
  legendDisclosure.append(legendButton, legend);

  const statusRegion = document.createElement('div');
  statusRegion.className = 'atlas-status ui-panel';
  statusRegion.dataset.safeRegion = '';
  const status = textElement('p', 'Loading interactive atlas…');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const fallback = document.createElement('div');
  fallback.className = 'app-shell__fallback';
  fallback.hidden = true;
  const fallbackText = textElement('p', '3D view is unavailable. Continue with the semantic explorer or try again.');
  const retryButton = textElement('button', 'Retry 3D View');
  retryButton.type = 'button'; retryButton.dataset.retry = '';
  fallback.append(fallbackText, retryButton);
  statusRegion.append(status, fallback);

  const canvasDescription = textElement('p', 'Interactive institutional atlas. The semantic explorer provides the same organizations and connections without canvas gestures.', 'visually-hidden');
  canvasDescription.id = `atlas-canvas-description-${shellId}`;
  const bindCanvasAccessibility = (canvas: HTMLCanvasElement | null): void => {
    if (!canvas) return;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'SEi interactive institutional atlas');
    canvas.setAttribute('aria-describedby', canvasDescription.id);
  };
  bindCanvasAccessibility(root.querySelector('canvas'));

  element.append(header, explorerToggle, navigator, detailToggle, card, statusRegion, canvasDescription);
  root.append(element);
  const canvasObserver = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => {
    bindCanvasAccessibility(root.querySelector('canvas'));
  });
  canvasObserver?.observe(root, { childList: true, subtree: true });

  let currentState = reduceNeighborhoodState(initialNeighborhoodState(), { type: 'ENTER_SCOPE', scopeId: 'cims' });
  let currentViewModel = createAtlasViewModel(currentState, entities, ENTITY_PRESENTATION);
  let detailExpanded = false;
  const compactMedia = options.compactMedia ?? window.matchMedia?.('(max-width: 900px)');
  let compactLayout = compactMedia?.matches ?? false;
  let legendExpanded = !compactLayout;
  let explorerExpanded = !compactLayout;
  let reducedMotion = false;
  let disposed = false;
  let lastFocusedElement: HTMLElement | null = null;
  navigator.hidden = !explorerExpanded;
  explorerToggle.setAttribute('aria-expanded', String(explorerExpanded));
  legend.hidden = !legendExpanded;
  legendButton.setAttribute('aria-expanded', String(legendExpanded));

  const setExplorerExpanded = (expanded: boolean): void => {
    explorerExpanded = expanded;
    navigator.hidden = !expanded;
    explorerToggle.setAttribute('aria-expanded', String(expanded));
  };

  const onCompactLayoutChange = (event: MediaQueryListEvent): void => {
    const activeElement = document.activeElement;
    const focusedElement = activeElement === document.body && lastFocusedElement
      ? lastFocusedElement
      : activeElement;
    const focusWasInNavigator = navigator.contains(focusedElement);
    const focusWillBeHidden = event.matches && (
      focusWasInNavigator
      || focusedElement === reducedMotionButton
    );
    const moveFocusIntoDetail = focusWillBeHidden && detailExpanded && Boolean(currentViewModel.selected);
    if (moveFocusIntoDetail) focusOpenDetail();
    compactLayout = event.matches;
    if (compactLayout && legendExpanded) {
      legendExpanded = false;
      legend.hidden = true;
      legendButton.setAttribute('aria-expanded', 'false');
    }
    setExplorerExpanded(!compactLayout);
    if (focusWillBeHidden && !moveFocusIntoDetail) {
      (focusWasInNavigator ? explorerToggle : overviewButton).focus();
    }
  };
  compactMedia?.addEventListener?.('change', onCompactLayoutChange);

  const renderBreadcrumbs = (viewModel: AtlasViewModel): void => {
    breadcrumbList.replaceChildren();
    const parents = viewModel.breadcrumbs.filter((item) => !item.current);
    for (const [index, item] of viewModel.breadcrumbs.entries()) {
      const listItem = document.createElement('li');
      if (item.current) {
        const label = document.createElement('span');
        label.textContent = item.label;
        label.setAttribute('aria-current', 'page');
        listItem.append(label);
        breadcrumbList.append(listItem);
        continue;
      }
      const isImmediateParent = index === parents.length - 1;
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'atlas-breadcrumb__crumb';
      label.textContent = item.label;
      if (isImmediateParent) {
        label.dataset.back = '';
        label.setAttribute('aria-label', `Back to ${item.label}`);
      } else {
        label.setAttribute('aria-label', `Go to ${item.label}`);
      }
      label.addEventListener('click', () => {
        if (isImmediateParent) options.onBack?.();
        else if (item.id === 'sei') options.onScope?.('sei');
        else if (item.id === 'cims-hub') options.onScope?.('cims');
        else options.onSelect(item.id);
      });
      listItem.append(label);
      breadcrumbList.append(listItem);
    }
  };

  const renderNavigator = (viewModel: AtlasViewModel): void => {
    const activeElement = document.activeElement;
    const focusedId = activeElement instanceof HTMLButtonElement
      && navigator.contains(activeElement)
      ? activeElement.dataset.entityId
      : undefined;
    const legendWasFocused = legendDisclosure.contains(activeElement);
    const scrollList = document.createElement('div');
    scrollList.className = 'organization-nav__scroll';
    for (const category of viewModel.categories) {
      const section = document.createElement('section');
      section.className = 'organization-nav__group';
      section.dataset.categoryGroup = category.id;
      const heading = textElement('h3', category.label, 'organization-nav__group-title');
      heading.id = `organization-category-${shellId}-${category.id}`;
      section.setAttribute('aria-labelledby', heading.id);
      const list = document.createElement('ul');
      list.className = 'organization-nav__items';
      for (const item of category.items) {
        const listItem = document.createElement('li');
        const button = textElement('button', item.label, 'organization-nav__entity');
        button.type = 'button'; button.dataset.entityId = item.id;
        button.setAttribute('aria-label', `View ${item.fullName}`);
        if (item.selected) button.setAttribute('aria-current', 'true');
        button.addEventListener('pointerenter', () => options.onPreview?.(item.id));
        button.addEventListener('focus', () => options.onPreview?.(item.id));
        button.addEventListener('pointerleave', () => options.onPreview?.(null));
        button.addEventListener('blur', () => options.onPreview?.(null));
        button.addEventListener('click', () => item.scopeAction ? options.onScope?.(item.scopeAction) : options.onSelect(item.id));
        listItem.append(button); list.append(listItem);
      }
      section.append(heading, list); scrollList.append(section);
    }
    navigator.replaceChildren(
      textElement('h2', 'Explore the Atlas', 'organization-nav__title'),
      scrollList,
      legendDisclosure,
    );
    if (focusedId) {
      navigator.querySelector<HTMLButtonElement>(`[data-entity-id="${focusedId}"]`)?.focus();
    } else if (legendWasFocused) {
      legendButton.focus();
    }
  };

  const renderDetail = (viewModel: AtlasViewModel): void => {
    card.replaceChildren();
    const selected = viewModel.selected;
    detailToggle.hidden = !selected;
    if (!selected) { card.hidden = true; return; }
    const headingRow = document.createElement('div'); headingRow.className = 'entity-card__heading';
    headingRow.append(textElement('h2', selected.name));
    const dismiss = textElement('button', 'Collapse Details');
    dismiss.type = 'button'; dismiss.dataset.detailDismiss = ''; dismiss.setAttribute('aria-label', 'Collapse selected details');
    dismiss.addEventListener('click', () => {
      setDetailExpanded(false);
      detailToggle.focus();
    });
    headingRow.append(dismiss); card.append(headingRow);
    if (selected.leader) { card.append(textElement('h3', 'Leadership')); card.append(textElement('p', selected.leader)); }
    card.append(textElement('h3', 'About')); card.append(textElement('p', selected.description));
    if (selected.example) { card.append(textElement('h3', 'Example')); card.append(textElement('p', selected.example)); }
    for (const group of selected.relationshipGroups) {
      const section = document.createElement('section'); section.dataset.relationshipGroup = group.kind;
      section.append(textElement('h3', group.label));
      const list = document.createElement('ul');
      for (const relationship of group.items) {
        const item = document.createElement('li');
        const button = textElement('button', relationship.text, 'entity-card__relationship');
        button.type = 'button'; button.dataset.relationship = relationship.id;
        button.addEventListener('click', () => options.onRelationship?.(relationship));
        item.append(button); list.append(item);
      }
      section.append(list); card.append(section);
    }
    card.hidden = !detailExpanded;
    detailToggle.setAttribute('aria-expanded', String(detailExpanded));
    detailToggle.textContent = detailExpanded ? 'Hide Details' : 'Show Details';
  };

  const setDetailExpanded = (expanded: boolean): void => {
    detailExpanded = expanded;
    card.hidden = !expanded || !currentViewModel.selected;
    detailToggle.setAttribute('aria-expanded', String(expanded));
    detailToggle.textContent = expanded ? 'Hide Details' : 'Show Details';
    options.onDetailDisclosureChange?.(expanded);
  };

  const focusOpenDetail = (): void => {
    card.querySelector<HTMLButtonElement>('[data-detail-dismiss]')?.focus();
  };

  const render = (state: NeighborhoodState, viewModel: AtlasViewModel): void => {
    const selectionChanged = currentState.selectedId !== state.selectedId;
    currentState = state; currentViewModel = viewModel;
    if (selectionChanged) {
      detailExpanded = Boolean(state.selectedId);
      if (state.selectedId && compactLayout) setExplorerExpanded(false);
    }
    renderBreadcrumbs(viewModel); renderNavigator(viewModel); renderDetail(viewModel);
    if (selectionChanged && state.selectedId && compactLayout) focusOpenDetail();
    if (state.selectedId) overviewButton.removeAttribute('aria-current');
    else overviewButton.setAttribute('aria-current', 'true');
    element.dataset.scope = state.scopeId;
    setStatus(state.webgl);
  };

  const setStatus = (webglStatus: WebglStatus): void => {
    element.dataset.webglStatus = webglStatus;
    fallback.hidden = webglStatus !== 'failed';
    if (webglStatus === 'failed') {
      fallback.setAttribute('role', 'alert'); status.hidden = true;
    } else {
      fallback.removeAttribute('role'); status.hidden = false;
      status.textContent = webglStatus === 'loading' ? 'Loading interactive atlas…' : 'Interactive atlas ready.';
    }
  };

  const setSelected = (id: string | null): void => {
    const scopeId = id ? ENTITY_PRESENTATION.get(id)?.scopeId ?? currentState.scopeId : currentState.scopeId;
    currentState = { ...currentState, scopeId, selectedId: id, webgl: currentState.webgl };
    currentViewModel = createAtlasViewModel(currentState, entities, ENTITY_PRESENTATION);
    for (const button of navigator.querySelectorAll<HTMLButtonElement>('[data-entity-id]')) {
      if (button.dataset.entityId === id) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
    renderBreadcrumbs(currentViewModel);
    if (id) {
      overviewButton.removeAttribute('aria-current');
      if (compactLayout) setExplorerExpanded(false);
      detailExpanded = true;
      renderDetail(currentViewModel);
      if (compactLayout) focusOpenDetail();
      return;
    }
    overviewButton.setAttribute('aria-current', 'true');
    detailExpanded = false;
    detailToggle.hidden = true;
    card.hidden = true;
    card.replaceChildren();
  };

  const setReducedMotion = (reduced: boolean): void => {
    reducedMotion = reduced;
    reducedMotionButton.setAttribute('aria-pressed', String(reduced));
    element.dataset.reducedMotion = String(reduced);
  };

  const measureSafeInsets = (): SafeInsetsMeasurement => {
    const shellRect = element.getBoundingClientRect();
    const rectangles = [...element.querySelectorAll<HTMLElement>('[data-safe-region]')]
      .filter((region) => !region.hidden)
      .map((region) => region.getBoundingClientRect())
      .filter((rectangle) => rectangle.width > 1 && rectangle.height > 1)
      .map((rectangle) => ({
        top: rectangle.top - shellRect.top, right: rectangle.right - shellRect.left,
        bottom: rectangle.bottom - shellRect.top, left: rectangle.left - shellRect.left,
      }));
    const insets = { top: 0, right: 0, bottom: 0, left: 0 };
    const width = shellRect.width;
    const height = shellRect.height;
    for (const rectangle of rectangles) {
      const spansHorizontalCenter = rectangle.left <= width / 2 && rectangle.right >= width / 2;
      const spansVerticalCenter = rectangle.top <= height / 2 && rectangle.bottom >= height / 2;
      const horizontalCoverage = (rectangle.right - rectangle.left) / width;
      const verticalCoverage = (rectangle.bottom - rectangle.top) / height;
      const reservations = {
        top: rectangle.bottom,
        right: width - rectangle.left,
        bottom: height - rectangle.top,
        left: rectangle.right,
      };
      const gaps = {
        top: rectangle.top,
        right: width - rectangle.right,
        bottom: height - rectangle.bottom,
        left: rectangle.left,
      };
      if (spansHorizontalCenter && (!spansVerticalCenter || horizontalCoverage >= verticalCoverage)) {
        const edge = gaps.top <= gaps.bottom ? 'top' : 'bottom';
        insets[edge] = Math.max(insets[edge], reservations[edge]);
      } else if (spansVerticalCenter) {
        const edge = gaps.left <= gaps.right ? 'left' : 'right';
        insets[edge] = Math.max(insets[edge], reservations[edge]);
      } else {
        const nearestGap = Math.min(gaps.top, gaps.right, gaps.bottom, gaps.left);
        for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
          if (gaps[edge] === nearestGap) insets[edge] = Math.max(insets[edge], reservations[edge]);
        }
      }
    }
    return {
      rectangles,
      insets,
    };
  };

  const onKeyDown = (event: KeyboardEvent): void => { if (event.key === 'Escape' && !isEditingTarget(event.target)) options.onOverview(); };
  const onFocusIn = (event: FocusEvent): void => {
    if (event.target instanceof HTMLElement) lastFocusedElement = event.target;
  };
  const skipLink = document.querySelector<HTMLAnchorElement>('.skip-link[href="#organization-explorer"]');
  const onSkipToExplorer = (event: Event): void => {
    event.preventDefault();
    setExplorerExpanded(true);
    navigator.focus();
  };
  overviewButton.addEventListener('click', options.onOverview);
  retryButton.addEventListener('click', () => options.onRetry?.());
  reducedMotionButton.addEventListener('click', () => { setReducedMotion(!reducedMotion); options.onReducedMotionChange?.(reducedMotion); });
  detailToggle.addEventListener('click', () => {
    const expanding = !detailExpanded;
    setDetailExpanded(expanding);
    if (expanding && compactLayout) focusOpenDetail();
  });
  legendButton.addEventListener('click', () => {
    legendExpanded = !legendExpanded; legend.hidden = !legendExpanded;
    legendButton.setAttribute('aria-expanded', String(legendExpanded)); options.onLegendDisclosureChange?.(legendExpanded);
  });
  explorerToggle.addEventListener('click', () => {
    setExplorerExpanded(!explorerExpanded);
  });
  document.addEventListener('keydown', onKeyDown);
  element.addEventListener('focusin', onFocusIn);
  skipLink?.addEventListener('click', onSkipToExplorer);
  render(currentState, currentViewModel);
  setStatus('loading');

  return {
    element, navigator, card, render, measureSafeInsets, setStatus, setSelected,
    setWebGLStatus: setStatus, setReducedMotion,
    dispose: () => {
      if (disposed) return; disposed = true;
      document.removeEventListener('keydown', onKeyDown);
      element.removeEventListener('focusin', onFocusIn);
      skipLink?.removeEventListener('click', onSkipToExplorer);
      compactMedia?.removeEventListener?.('change', onCompactLayoutChange);
      canvasObserver?.disconnect();
      element.remove();
    },
  };
}
