// ==UserScript==
// @name         Twitch Theater Mode Sidebar
// @namespace    https://github.com/
// @version      1.1.2
// @description  Slide-out sidebar in Twitch theater mode when hovering the left edge
// @author       Kristijan1001
// @match        https://www.twitch.tv/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitch.tv
// @grant        GM_addStyle
// @run-at       document-idle
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/584623/Twitch%20Theater%20Mode%20Sidebar.user.js
// @updateURL https://update.greasyfork.org/scripts/584623/Twitch%20Theater%20Mode%20Sidebar.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // ─── Config ───────────────────────────────────────────────────────────────
    const TRIGGER_ZONE_WIDTH = 24;   // px from left edge that activates the hover
    const SIDEBAR_WIDTH      = 260;  // px — matches Twitch's native sidebar
    const SHOW_DELAY_MS      = 80;   // ms before showing (avoids accidental triggers)
    const HIDE_DELAY_MS      = 300;  // ms after cursor leaves before hiding
    // ──────────────────────────────────────────────────────────────────────────

    GM_addStyle(`
        #tms-trigger {
            position: fixed;
            top: 0;
            left: 0;
            width: ${TRIGGER_ZONE_WIDTH}px;
            height: 100vh;
            z-index: 9998;
            pointer-events: none; /* only active in theater mode */
        }

        #tms-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: ${SIDEBAR_WIDTH}px;
            height: 100vh;
            z-index: 9999;
            background: var(--color-background-base, #0e0e10);
            border-right: 1px solid rgba(255,255,255,0.08);
            box-shadow: 4px 0 24px rgba(0,0,0,0.55);
            transform: translateX(-${SIDEBAR_WIDTH + 8}px);
            transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
            overflow-y: auto;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
        }

        #tms-overlay.tms-visible {
            transform: translateX(0);
        }

        /* Header */
        #tms-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px 10px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            flex-shrink: 0;
        }

        #tms-header span {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: var(--color-text-alt-2, #adadb8);
        }

        #tms-close {
            background: none;
            border: none;
            color: var(--color-text-alt-2, #adadb8);
            cursor: pointer;
            padding: 4px 6px;
            border-radius: 4px;
            font-size: 16px;
            line-height: 1;
            transition: color 0.1s, background 0.1s;
        }
        #tms-close:hover {
            color: #fff;
            background: rgba(255,255,255,0.08);
        }

        /* Content clone area */
        #tms-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
        }

        /* Clone the nav cards */
        #tms-content .side-nav-section {
            padding: 8px 0;
        }

        #tms-content .side-nav-section > *:first-child {
            padding: 6px 14px 4px;
        }

        #tms-content h3 {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--color-text-alt-2, #adadb8);
            margin: 0;
        }

        #tms-content .side-nav-card {
            display: flex;
            align-items: center;
        }

        #tms-content .side-nav-card__link {
            display: flex;
            align-items: center;
            width: 100%;
            padding: 4px 14px;
            text-decoration: none;
            color: var(--color-text-base, #efeff1);
            gap: 10px;
            border-radius: 0;
            transition: background 0.1s;
        }

        #tms-content .side-nav-card__link:hover {
            background: rgba(255,255,255,0.07);
        }

        #tms-content .tw-avatar {
            width: 30px !important;
            height: 30px !important;
            border-radius: 50%;
            flex-shrink: 0;
            overflow: hidden;
        }

        #tms-content .tw-image-avatar {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        #tms-content .side-nav-card__link__tooltip-arrow,
        #tms-content .side-nav-card__live-status > p.InjectLayout-sc-1i43xsx-0 {
            display: none !important;
        }

        #tms-content [data-a-target="side-nav-card-metadata"] {
            flex: 1;
            min-width: 0;
        }

        #tms-content .side-nav-card__title p,
        #tms-content .side-nav-card__title span {
            font-size: 13px;
            font-weight: 600;
            color: var(--color-text-base, #efeff1);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        #tms-content .side-nav-card__metadata p {
            font-size: 12px;
            color: var(--color-text-alt-2, #adadb8);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        #tms-content .side-nav-card__live-status {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        #tms-content .tw-channel-status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #eb0400;
            flex-shrink: 0;
        }

        #tms-content .side-nav-card__live-status span[aria-hidden="true"] {
            font-size: 12px;
            color: var(--color-text-alt-2, #adadb8);
            white-space: nowrap;
        }

        #tms-content .side-nav-card__avatar--offline .tw-avatar {
            opacity: 0.5;
        }

        #tms-content .side-nav-card__link--offline .side-nav-card__title p {
            color: var(--color-text-alt-2, #adadb8);
        }

        /* Scrollbar */
        #tms-content::-webkit-scrollbar { width: 4px; }
        #tms-content::-webkit-scrollbar-track { background: transparent; }
        #tms-content::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.15);
            border-radius: 2px;
        }

        /* Edge indicator when in theater mode */
        #tms-trigger.active {
            pointer-events: auto;
        }
        #tms-trigger.active::after {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 3px;
            height: 60px;
            border-radius: 0 3px 3px 0;
            background: rgba(145, 71, 255, 0.6);
            opacity: 0;
            transition: opacity 0.2s;
        }
        #tms-trigger.active:hover::after {
            opacity: 1;
        }
    `);

    // ─── DOM setup ────────────────────────────────────────────────────────────

    const trigger = document.createElement('div');
    trigger.id = 'tms-trigger';
    document.body.appendChild(trigger);

    const overlay = document.createElement('div');
    overlay.id = 'tms-overlay';
    overlay.innerHTML = `
        <div id="tms-header">
            <span>Followed Channels</span>
            <button id="tms-close" title="Close">✕</button>
        </div>
        <div id="tms-content"></div>
    `;
    document.body.appendChild(overlay);

    const content = overlay.querySelector('#tms-content');
    const closeBtn = overlay.querySelector('#tms-close');

    // ─── State ────────────────────────────────────────────────────────────────

    let isVisible    = false;
    let showTimer    = null;
    let hideTimer    = null;
    let isTheater    = false;
    let lastNavHtml  = '';

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function isTheaterMode() {
        // Strategy 1: look for theater-specific class on any ancestor of the player
        const theaterSelectors = [
            '[class*="theatre--"]',
            '[class*="theater--"]',
            '[data-a-target="player-overlay-click-handler"][class*="theatre"]',
            '.twilight-main--theatre',
            '.channel-root--theatre',
            '.channel-root--theater',
            '[class*="channel-root"][class*="theatre"]',
            '[class*="channel-root"][class*="theater"]',
        ];
        for (const sel of theaterSelectors) {
            if (document.querySelector(sel)) return true;
        }

        // Strategy 2: scan all elements for theater/theatre in class that aren't our own
        const allEls = document.querySelectorAll('[class*="theatre"],[class*="theater"]');
        for (const el of allEls) {
            if (el.id && el.id.startsWith('tms-')) continue;
            const cls = el.className || '';
            if (/theatre|theater/i.test(cls)) return true;
        }

        return false;
    }

    function cloneSidebar() {
        const nav = document.querySelector('#side-nav') ||
                    document.querySelector('[aria-label="Left Navigation"]') ||
                    document.querySelector('.side-bar-contents nav');
        if (!nav) return;

        const html = nav.innerHTML;
        if (html === lastNavHtml) return; // nothing changed
        lastNavHtml = html;

        // Clone only the sections we care about (followed channels etc.)
        const clone = nav.cloneNode(true);

        // Remove elements that don't make sense in the overlay
        clone.querySelectorAll(
            '[data-a-target="side-nav-show-less-button"],' +
            '[data-a-target="side-nav-show-more-button"],' +
            '.side-nav-show-more-toggle__button,' +
            '.storiesLeftNavSection--csO9S,' +
            '.skip-to-target'
        ).forEach(el => el.remove());

        content.innerHTML = '';
        content.appendChild(clone);

        // Intercept clicks for instant SPA navigation
        content.querySelectorAll('a[href]').forEach(a => {
            a.addEventListener('click', e => {
                const href = a.getAttribute('href');
                if (!href || href.startsWith('http')) return;
                e.preventDefault();
                e.stopPropagation();
                hide(true);
                navigateTo(href);
            });
        });
    }

    // ─── Instant SPA navigation ───────────────────────────────────────────────
    // Find and click the real anchor in the live Twitch nav so React Router
    // handles the transition natively — no pushState hacks needed.

    function navigateTo(path) {
        const target = path.startsWith('/') ? path : '/' + path;

        // Already here? Nothing to do.
        if (window.location.pathname.toLowerCase() === target.toLowerCase()) return;

        // Try to find the real link in the actual (hidden) Twitch sidebar and click it.
        // This goes through React Router's own event handlers.
        const realNav = document.querySelector('#side-nav') ||
                        document.querySelector('[aria-label="Left Navigation"]') ||
                        document.querySelector('.side-bar-contents nav');

        if (realNav) {
            const realLink = realNav.querySelector(`a[href="${target}"]`);
            if (realLink) {
                realLink.click();
                return;
            }
        }

        // Fallback: hard navigate
        window.location.href = target;
    }

    function show() {
        clearTimeout(hideTimer);
        if (isVisible) return;
        cloneSidebar();
        isVisible = true;
        overlay.classList.add('tms-visible');
    }

    function hide(immediate = false) {
        clearTimeout(showTimer);
        if (!isVisible) return;
        if (immediate) {
            isVisible = false;
            overlay.classList.remove('tms-visible');
        } else {
            hideTimer = setTimeout(() => {
                isVisible = false;
                overlay.classList.remove('tms-visible');
            }, HIDE_DELAY_MS);
        }
    }

    function updateTheaterState() {
        const theater = isTheaterMode();
        if (theater !== isTheater) {
            isTheater = theater;
            trigger.classList.toggle('active', isTheater);
            if (!isTheater && isVisible) hide(true);
        }
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    // Trigger zone hover
    trigger.addEventListener('mouseenter', () => {
        if (!isTheater) return;
        clearTimeout(hideTimer);
        showTimer = setTimeout(show, SHOW_DELAY_MS);
    });

    trigger.addEventListener('mouseleave', () => {
        clearTimeout(showTimer);
    });

    // Keep visible while mouse is over the overlay
    overlay.addEventListener('mouseenter', () => {
        clearTimeout(hideTimer);
    });

    overlay.addEventListener('mouseleave', () => {
        hide();
    });

    closeBtn.addEventListener('click', () => hide(true));

    // ESC to close
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && isVisible) hide(true);
    });

    // Click outside
    document.addEventListener('click', e => {
        if (isVisible && !overlay.contains(e.target) && e.target !== trigger) {
            hide(true);
        }
    });

    // Also show on left-edge mouse move (wider detection than the trigger div alone)
    document.addEventListener('mousemove', e => {
        if (!isTheater) return;
        if (e.clientX <= TRIGGER_ZONE_WIDTH) {
            clearTimeout(hideTimer);
            if (!isVisible) {
                clearTimeout(showTimer);
                showTimer = setTimeout(show, SHOW_DELAY_MS);
            }
        }
    });

    // ─── Poll for theater mode changes ────────────────────────────────────────

    let pollInterval = setInterval(updateTheaterState, 800);

    // Also use MutationObserver on body class list for faster detection
    const mo = new MutationObserver(updateTheaterState);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true, subtree: false });

    // Initial check
    // Wait a tick for Twitch to finish rendering
    setTimeout(updateTheaterState, 1500);

})();