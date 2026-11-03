// content.js - v4.1 FIXED - Job Title, Company, Website + Full Name logic
(function() {
    // --- HELPER FUNCTIONS ---
    function dispatchInputEvents(element) {
        if (!element) return;
        try {
            element.focus();
            element.value = element.value;
            element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        } catch (e) {
            console.error('Error dispatching events:', e);
        }
    }

    function findField(selectors, context = document) {
        for (const selector of selectors) {
            try {
                const field = context.querySelector(selector);
                if (field) return field;
            } catch (e) {}
        }
        return null;
    }

    // Only check for truly hidden honeypots — be very conservative
    function isHiddenHoneypot(element) {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        // Only skip if explicitly hidden with display:none or visibility:hidden
        if (style.display === 'none' || style.visibility === 'hidden') return true;
        // Skip type=hidden inputs (they're not visible by design)
        if (element.type === 'hidden') return true;
        return false;
    }

    function detectPopup(callback) {
        const popupSelectors = [
            '[role="dialog"]', '[role="modal"]', '.modal', '.popup', '.overlay', '.dialog',
            '.newsletter-popup', '.signup-popup', '.email-popup', '.modal-dialog', '.popup-dialog',
            '[class*="modal"]', '[class*="popup"]', '[class*="overlay"]',
            '[id*="modal"]', '[id*="popup"]', '[id*="overlay"]',
            '.fancybox-content', '.mfp-content', '.swal2-container', '.sweetalert2-container',
            '.tcb-popup', '.wpr-popup', '.pum-container', '.pp-popup', '.icegram-popup'
        ];
        let popup = null;
        for (const selector of popupSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const elem of elements) {
                const style = window.getComputedStyle(elem);
                if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                    popup = elem;
                    console.log('Found popup:', selector);
                    break;
                }
            }
            if (popup) break;
        }
        if (!popup) {
            const fixedElements = document.querySelectorAll('*');
            for (const elem of fixedElements) {
                const style = window.getComputedStyle(elem);
                if (style.position === 'fixed' && style.display !== 'none' &&
                    style.visibility !== 'hidden' && style.opacity !== '0' &&
                    elem.offsetWidth > 100 && elem.offsetHeight > 100) {
                    const hasForm = elem.querySelector('form, input[type="email"], input[type="text"], button');
                    if (hasForm) { popup = elem; console.log('Found fixed position popup'); break; }
                }
            }
        }
        callback(popup);
    }

    function waitForPopup(callback, maxWait = 5000) {
        let attempts = 0;
        const maxAttempts = maxWait / 100;
        function check() {
            detectPopup((popup) => {
                if (popup) callback(popup);
                else if (attempts < maxAttempts) { attempts++; setTimeout(check, 100); }
                else callback(null);
            });
        }
        check();
    }

    function checkConsentCheckboxes(context = document) {
        const consentSelectors = [
            'input[type="checkbox"][name*="consent" i]', 'input[type="checkbox"][name*="agree" i]',
            'input[type="checkbox"][name*="accept" i]', 'input[type="checkbox"][name*="terms" i]',
            'input[type="checkbox"][name*="privacy" i]', 'input[type="checkbox"][name*="gdpr" i]',
            'input[type="checkbox"][id*="consent" i]', 'input[type="checkbox"][id*="agree" i]',
            'input[type="checkbox"][id*="accept" i]', 'input[type="checkbox"][id*="terms" i]',
            'input[type="checkbox"][id*="privacy" i]', 'input[type="checkbox"][id*="gdpr" i]',
            'input[type="checkbox"][class*="consent" i]', 'input[type="checkbox"][class*="agree" i]',
            'input[type="checkbox"][class*="accept" i]', 'input[type="checkbox"][class*="terms" i]',
            'input[type="checkbox"][class*="privacy" i]', 'input[type="checkbox"][class*="gdpr" i]',
            'input[type="checkbox"][aria-label*="consent" i]', 'input[type="checkbox"][aria-label*="agree" i]',
            'input[type="checkbox"][aria-label*="accept" i]', 'input[type="checkbox"][aria-label*="terms" i]',
            'input[type="checkbox"][aria-label*="privacy" i]',
            'input[type="checkbox"][data-testid*="consent" i]', 'input[type="checkbox"][data-testid*="agree" i]',
            'input[type="checkbox"][data-testid*="accept" i]', 'input[type="checkbox"][data-testid*="terms" i]',
            'input[type="checkbox"][data-testid*="privacy" i]'
        ];
        let checkedCount = 0;
        consentSelectors.forEach(selector => {
            try {
                const checkboxes = context.querySelectorAll(selector);
                checkboxes.forEach(checkbox => {
                    if (!checkbox.checked) {
                        try {
                            checkbox.checked = true;
                            checkbox.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                            checkbox.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
                            checkedCount++;
                            console.log('Checked consent checkbox:', selector);
                        } catch (e) { console.error('Error checking checkbox:', e); }
                    }
                });
            } catch (e) {}
        });
        const emailField = context.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]');
        if (emailField) {
            const form = emailField.closest('form');
            if (form) {
                const allCheckboxes = form.querySelectorAll('input[type="checkbox"]');
                allCheckboxes.forEach(checkbox => {
                    if (!checkbox.checked) {
                        const parent = checkbox.closest('label, div, p');
                        if (parent) {
                            const text = parent.textContent.toLowerCase();
                            if (text.includes('consent') || text.includes('agree') || text.includes('accept') ||
                                text.includes('terms') || text.includes('privacy') || text.includes('gdpr') ||
                                text.includes('newsletter') || text.includes('subscribe') || text.includes('email')) {
                                checkbox.checked = true;
                                checkbox.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                                checkbox.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
                                checkedCount++;
                                console.log('Checked nearby consent checkbox');
                            }
                        }
                    }
                });
            }
        }
        return checkedCount;
    }

    function findSubmitButton(form, emailField, context = document) {
        const selectors = [
            'button[type="submit"]', 'input[type="submit"]', 'button:not([type])',
            'button[type="button"]', 'a[href*="submit"]', 'a[href*="subscribe"]',
            'a[onclick*="submit"]', 'a[onclick*="subscribe"]'
        ];
        let buttons = [];
        if (form) buttons = form.querySelectorAll(selectors.join(','));
        else buttons = context.querySelectorAll(selectors.join(','));

        for (const button of buttons) {
            const text = (button.innerText || button.value || button.title || '').toLowerCase();
            const onclick = button.getAttribute('onclick') || button.onclick;
            const href = button.getAttribute('href') || '';
            if (text.includes('subscribe') || text.includes('sign up') || text.includes('submit') ||
                text.includes('go') || text.includes('register') || text.includes('join') ||
                text.includes('get') || text.includes('send') || text.includes('continue') ||
                onclick || href.includes('submit') || href.includes('subscribe')) {
                const style = window.getComputedStyle(button);
                if (style.display !== 'none' && style.visibility !== 'hidden' &&
                    !button.disabled && !button.hasAttribute('disabled')) return button;
            }
        }
        if (emailField) {
            const parent = emailField.closest('div, form, section, li');
            if (parent) {
                const nearbyButtons = parent.querySelectorAll('button, input[type="button"], input[type="submit"], a[onclick], a[href]');
                for (const btn of nearbyButtons) {
                    if (btn !== emailField) {
                        const style = window.getComputedStyle(btn);
                        if (style.display !== 'none' && style.visibility !== 'hidden' &&
                            !btn.disabled && !btn.hasAttribute('disabled')) return btn;
                    }
                }
            }
        }
        if (form) {
            const anyButton = form.querySelector('button:not([disabled]), input[type="submit"]:not([disabled]), input[type="button"]:not([disabled])');
            if (anyButton) return anyButton;
        }
        if (form) {
            const clickables = form.querySelectorAll('[onclick], [role="button"], .btn, .submit, [class*="button"]');
            for (const elem of clickables) {
                const style = window.getComputedStyle(elem);
                if (style.display !== 'none' && style.visibility !== 'hidden' &&
                    !elem.disabled && !elem.hasAttribute('disabled') &&
                    (elem.onclick || elem.getAttribute('onclick') || elem.getAttribute('role') === 'button')) return elem;
            }
        }
        if (emailField) {
            const siblings = Array.from(emailField.parentElement?.children || []);
            for (const sibling of siblings) {
                if (sibling !== emailField && (sibling.tagName === 'BUTTON' || sibling.tagName === 'A' || sibling.tagName === 'INPUT' || sibling.onclick)) {
                    const style = window.getComputedStyle(sibling);
                    if (style.display !== 'none' && style.visibility !== 'hidden' &&
                        !sibling.disabled && !sibling.hasAttribute('disabled')) return sibling;
                }
            }
        }
        return null;
    }

    function scrollToElement(element) {
        if (!element) return;
        try {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            setTimeout(() => {
                const rect = element.getBoundingClientRect();
                if (rect.top < 0 || rect.bottom > window.innerHeight) {
                    element.scrollIntoView({ behavior: 'auto', block: 'center' });
                }
            }, 500);
        } catch (e) {
            console.error('Error scrolling:', e);
            const rect = element.getBoundingClientRect();
            window.scrollTo({ top: rect.top + window.scrollY - window.innerHeight / 2, behavior: 'smooth' });
        }
    }

    function checkForPopupOverlays() {
        const overlaySelectors = [
            '.overlay', '[class*="overlay"]', '[id*="overlay"]',
            '.modal-backdrop', '[class*="modal-backdrop"]',
            '.popup-overlay', '[class*="popup-overlay"]',
            '.cookie-banner', '[class*="cookie-banner"]',
            '[class*="gdpr-banner"]', '[class*="consent-banner"]',
            '[class*="age-gate"]', '[class*="newsletter-popup"]'
        ];
        for (const selector of overlaySelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const elem of elements) {
                    const style = window.getComputedStyle(elem);
                    if (style.position === 'fixed' && style.display !== 'none' &&
                        style.zIndex > 1000 && elem.offsetWidth > 100 && elem.offsetHeight > 100) {
                        const hasCloseButton = elem.querySelector('button, [class*="close"], [class*="dismiss"]');
                        if (hasCloseButton) return elem;
                    }
                }
            } catch (e) {}
        }
        return false;
    }

    function tryBypassPopupOverlays() {
        const closeSelectors = [
            'button[class*="close"]', 'button[class*="dismiss"]',
            'button[class*="accept"]', 'button[class*="agree"]',
            'button[class*="continue"]', 'a[class*="close"]',
            'a[class*="dismiss"]', 'a[class*="accept"]', 'a[class*="continue"]',
            '[aria-label*="close"]', '[aria-label*="dismiss"]',
            '[aria-label*="accept"]', '[aria-label*="continue"]'
        ];
        for (const selector of closeSelectors) {
            try {
                const buttons = document.querySelectorAll(selector);
                for (const button of buttons) {
                    const style = window.getComputedStyle(button);
                    if (style.display !== 'none' && style.visibility !== 'hidden' &&
                        !button.disabled && !button.hasAttribute('disabled')) {
                        button.click();
                    }
                }
            } catch (e) {}
        }
        return false;
    }

    function submitForm(button, form, emailField, context = document) {
        console.log('Attempting to submit form with button:', button);
        const clickMethods = [
            () => button.click(),
            () => { const e = new MouseEvent('click', { view: window, bubbles: true, cancelable: true }); button.dispatchEvent(e); },
            () => { const e = new TouchEvent('touchstart', { bubbles: true, cancelable: true }); button.dispatchEvent(e); },
            () => { button.focus(); button.click(); },
            () => { if (form && form.tagName === 'FORM') form.submit(); },
            () => {
                if (emailField) {
                    emailField.focus();
                    emailField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
                }
            },
            () => {
                if (button.onclick) { button.onclick(); }
                else if (button.getAttribute('onclick')) { try { eval(button.getAttribute('onclick')); } catch (e) { console.error('Error executing onclick:', e); } }
            }
        ];
        for (let i = 0; i < clickMethods.length; i++) {
            try {
                console.log(`Trying submission method ${i + 1}`);
                clickMethods[i]();
                setTimeout(() => {
                    chrome.runtime.sendMessage({ action: "SCRIPT_COMPLETE", status: 'success', message: 'Form submitted successfully.' });
                }, 2000);
                break;
            } catch (e) {
                console.error(`Method ${i + 1} failed:`, e);
                if (i === clickMethods.length - 1) {
                    chrome.runtime.sendMessage({ action: "SCRIPT_COMPLETE", status: 'error', message: `Error submitting form: ${e.message}` });
                }
            }
        }
    }

    function checkRequiredFields(form, data) {
        const hasNameFields = form.querySelector('input[name*="first" i], input[name*="last" i], input[name*="name" i]') !== null;
        const nameFieldsRequired = hasNameFields && (
            form.querySelector('input[name*="first" i][required], input[name*="last" i][required], input[name*="name" i][required]') !== null ||
            form.querySelector('input[required][name*="first" i], input[required][name*="last" i], input[required][name*="name" i]') !== null
        );
        console.log(`Form has name fields: ${hasNameFields}, Name fields required: ${nameFieldsRequired}`);
        return hasNameFields && nameFieldsRequired;
    }

    // v4.1 FIXED: Full Name field detection — never overwrites email field
    function fillNameFields(context, data, emailField) {
        const firstNameSelectors = [
            'input[name*="first" i], input[name*="fname" i], input[id*="first" i], input[id*="fname" i]',
            'input[placeholder*="first" i], input[autocomplete="given-name"]',
            'input[data-testid*="first" i], input[data-cy*="first" i]',
            'input[name*="given" i], input[id*="given" i]'
        ];
        const lastNameSelectors = [
            'input[name*="last" i], input[name*="lname" i], input[id*="last" i], input[id*="lname" i]',
            'input[placeholder*="last" i], input[autocomplete="family-name"]',
            'input[data-testid*="last" i], input[data-cy*="last" i]',
            'input[name*="family" i], input[id*="family" i]'
        ];
        const fullNameSelectors = [
            'input[name*="fullname" i]',
            'input[name*="full_name" i]',
            'input[name*="full-name" i]',
            'input[id*="fullname" i]',
            'input[placeholder*="full name" i]',
            'input[autocomplete="name"]'
        ];

        const firstNameField = findField(firstNameSelectors, context);
        const lastNameField = findField(lastNameSelectors, context);

        // Priority 1: Separate first + last name fields
        if (firstNameField && lastNameField) {
            if (data.firstName) { firstNameField.value = data.firstName; dispatchInputEvents(firstNameField); }
            if (data.lastName) { lastNameField.value = data.lastName; dispatchInputEvents(lastNameField); }
            console.log('Filled separate first and last name fields');
            return;
        }

        if (firstNameField && !lastNameField) {
            if (data.firstName) { firstNameField.value = data.firstName; dispatchInputEvents(firstNameField); }
            console.log('Filled first name field only');
            return;
        }

        // Priority 2: Combined full-name field — BUT skip if it's the email field!
        const fullNameField = findField(fullNameSelectors, context);
        if (fullNameField && fullNameField !== emailField && !isHiddenHoneypot(fullNameField)) {
            const fullName = (data.firstName + ' ' + data.lastName).trim();
            if (fullName) {
                fullNameField.value = fullName;
                dispatchInputEvents(fullNameField);
                console.log('Filled full name field with:', fullName);
            }
            return;
        }

        console.log('No name fields found, skipping name fill');
    }

    function processForm(context = document, isPopup = false) {
        const data = window.autoFillData || {};
        let form = context.querySelector('form');

        const emailSelectors = [
            'input[type="email"]',
            'input[name*="email" i], input[id*="email" i], input[placeholder*="email" i], input[aria-label*="email" i]',
            'input[data-testid*="email" i], input[data-cy*="email" i]',
            'input[autocomplete*="email" i]',
            'input[type="text"][name*="email" i], input[type="text"][id*="email" i]',
            'input[autocomplete="email"]',
            'input[placeholder*="email" i]',
            'input[aria-label*="email" i]',
            'input[class*="email" i]',
            'input[name*="newsletter" i], input[id*="newsletter" i]',
            'input[placeholder*="newsletter" i]',
            'input[aria-label*="newsletter" i]',
            'input[class*="newsletter" i]',
            'input[name*="subscribe" i], input[id*="subscribe" i]',
            'input[placeholder*="subscribe" i]',
            'input[aria-label*="subscribe" i]',
            'input[class*="subscribe" i]'
        ];
        const firstNameSelectors = [
            'input[name*="first" i], input[name*="fname" i], input[id*="first" i], input[id*="fname" i]',
            'input[placeholder*="first" i], input[autocomplete="given-name"]',
            'input[data-testid*="first" i], input[data-cy*="first" i]',
            'input[name*="given" i], input[id*="given" i]'
        ];
        const lastNameSelectors = [
            'input[name*="last" i], input[name*="lname" i], input[id*="last" i], input[id*="lname" i]',
            'input[placeholder*="last" i], input[autocomplete="family-name"]',
            'input[data-testid*="last" i], input[data-cy*="last" i]',
            'input[name*="family" i], input[id*="family" i]'
        ];
        const phoneSelectors = [
            'input[type="tel"]', 'input[name*="phone" i], input[id*="phone" i], input[placeholder*="phone" i]',
            'input[autocomplete="tel"]', 'input[data-testid*="phone" i]',
            'input[type="text"][name*="phone" i]'
        ];
        const zipSelectors = [
            'input[name*="zip" i], input[name*="postal" i], input[id*="zip" i], input[id*="postal" i]',
            'input[placeholder*="zip" i], input[autocomplete="postal-code"]',
            'input[data-testid*="zip" i]',
            'input[type="text"][name*="zip" i], input[type="text"][name*="postal" i]'
        ];
        const messageSelectors = [
            'textarea[name*="message" i], textarea[id*="message" i], textarea[placeholder*="message" i]',
            'textarea[data-testid*="message" i]'
        ];
        const jobTitleSelectors = [
            'input[name*="job" i], input[name*="title" i], input[name*="position" i], input[name*="role" i]',
            'input[autocomplete="organization-title"]',
            'input[id*="job" i], input[id*="title" i], input[id*="position" i], input[id*="role" i]',
            'input[placeholder*="job title" i], input[placeholder*="position" i], input[placeholder*="role" i]',
            'input[data-testid*="job" i], input[data-testid*="title" i], input[data-testid*="position" i]'
        ];
        const companySelectors = [
            'input[name*="company" i], input[name*="organization" i], input[name*="org" i]',
            'input[autocomplete="organization"]',
            'input[id*="company" i], input[id*="organization" i], input[id*="org" i]',
            'input[placeholder*="company" i], input[placeholder*="organization" i]',
            'input[data-testid*="company" i], input[data-testid*="organization" i]'
        ];
        const websiteSelectors = [
            'input[name*="website" i], input[name*="url" i], input[name*="web" i]',
            'input[type="url"]',
            'input[id*="website" i], input[id*="url" i], input[id*="web" i]',
            'input[placeholder*="website" i], input[placeholder*="url" i]',
            'input[data-testid*="website" i], input[data-testid*="url" i]'
        ];

        const emailField = findField(emailSelectors, context);

        if (emailField) {
            form = emailField.closest('form') || context.body;
            const shouldFillNameFields = checkRequiredFields(form, data);
            scrollToElement(emailField);

            setTimeout(() => {
                emailField.value = data.email;
                dispatchInputEvents(emailField);

                // v4.1: Use original logic for required name fields, plus full name detection
                if (shouldFillNameFields) {
                    const firstNameField = findField(firstNameSelectors, context);
                    if (firstNameField && data.firstName) { firstNameField.value = data.firstName; dispatchInputEvents(firstNameField); }
                    const lastNameField = findField(lastNameSelectors, context);
                    if (lastNameField && data.lastName) { lastNameField.value = data.lastName; dispatchInputEvents(lastNameField); }
                } else {
                    // Even if not required, try full name field detection
                    fillNameFields(context, data, emailField);
                }

                const phoneField = findField(phoneSelectors, context);
                if (phoneField && data.phone && !isHiddenHoneypot(phoneField)) { phoneField.value = data.phone; dispatchInputEvents(phoneField); }

                const zipField = findField(zipSelectors, context);
                if (zipField && data.zipCode && !isHiddenHoneypot(zipField)) { zipField.value = data.zipCode; dispatchInputEvents(zipField); }

                const messageField = findField(messageSelectors, context);
                if (messageField && data.customMessage && !isHiddenHoneypot(messageField)) { messageField.value = data.customMessage; dispatchInputEvents(messageField); }

                const jobTitleField = findField(jobTitleSelectors, context);
                if (jobTitleField && data.jobTitle && !isHiddenHoneypot(jobTitleField)) { jobTitleField.value = data.jobTitle; dispatchInputEvents(jobTitleField); }

                const companyField = findField(companySelectors, context);
                if (companyField && data.companyName && !isHiddenHoneypot(companyField)) { companyField.value = data.companyName; dispatchInputEvents(companyField); }

                const websiteField = findField(websiteSelectors, context);
                if (websiteField && data.websiteUrl && !isHiddenHoneypot(websiteField)) { websiteField.value = data.websiteUrl; dispatchInputEvents(websiteField); }

                const checkedCount = checkConsentCheckboxes(context);
                if (checkedCount > 0) console.log(`Checked ${checkedCount} consent checkbox(es)`);

                setTimeout(() => {
                    const submitButton = findSubmitButton(form, emailField, context);
                    if (submitButton) {
                        const buttonRect = submitButton.getBoundingClientRect();
                        if (buttonRect.top < 0 || buttonRect.bottom > window.innerHeight) {
                            scrollToElement(submitButton);
                            setTimeout(() => submitForm(submitButton, form, emailField, context), 500);
                        } else {
                            submitForm(submitButton, form, emailField, context);
                        }
                    } else if (form && form.tagName === 'FORM') {
                        try {
                            form.submit();
                            chrome.runtime.sendMessage({ action: "SCRIPT_COMPLETE", status: 'success', message: isPopup ? 'Popup form submitted successfully.' : 'Form submitted successfully.' });
                        } catch (e) {
                            chrome.runtime.sendMessage({ action: "SCRIPT_COMPLETE", status: 'error', message: `Error submitting form: ${e.message}` });
                        }
                    } else {
                        const message = isPopup ? 'No submit button found in popup.' : 'No submit button found.';
                        if (isPopup) { setTimeout(() => processMainPage(), 1000); }
                        else { chrome.runtime.sendMessage({ action: "SCRIPT_COMPLETE", status: 'error', message }); }
                    }
                }, 3000);
            }, 1500);

        } else {
            const message = isPopup ? 'No form or email field found in popup.' : 'No form or email field found.';
            console.log(message);
            if (isPopup) { setTimeout(() => processMainPage(), 1000); }
            else { chrome.runtime.sendMessage({ action: "SCRIPT_COMPLETE", status: 'error', message }); }
        }
    }

    function processMainPage() {
        if (checkForPopupOverlays()) {
            console.log('Popup overlay detected, attempting to bypass...');
            tryBypassPopupOverlays();
            setTimeout(() => processForm(document, false), 2000);
        } else {
            processForm(document, false);
        }
    }

    // --- MAIN LOGIC ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "AUTOFILL_FORM") {
            window.autoFillData = request.data;
            const enableScrolling = request.enableScrolling !== false;

            function startProcessing() {
                waitForPopup((popup) => {
                    if (popup) {
                        console.log('Processing popup form');
                        processForm(popup, true);
                    } else {
                        console.log('No popup detected, processing main page');
                        if (checkForPopupOverlays()) {
                            console.log('Popup overlay detected, attempting to bypass...');
                            tryBypassPopupOverlays();
                            setTimeout(() => processForm(document, false), 2000);
                        } else {
                            processForm(document, false);
                        }
                    }
                }, 3000);
            }

            startProcessing();
        }
    });
})();