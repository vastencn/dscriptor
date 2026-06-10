document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-button');
    const frames = document.querySelectorAll('.tool-frame');

    // Tab Switching Logic
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-target');
            if (targetId) {
                switchTab(targetId);
            }
        });
    });

    // Tauri Window Controls
    if (window.__TAURI__) {
        // Try getting window API
        let appWindow = null;
        if (window.__TAURI__.window) {
            appWindow = window.__TAURI__.window.getCurrentWindow();
        } else if (window.__TAURI__.core && window.__TAURI__.core.Window) {
            appWindow = window.__TAURI__.core.Window.getCurrent();
        }

        if (appWindow) {
            document.getElementById('titlebar-minimize')?.addEventListener('click', () => { appWindow.minimize(); });
            document.getElementById('titlebar-maximize')?.addEventListener('click', () => { appWindow.toggleMaximize(); });
            document.getElementById('titlebar-close')?.addEventListener('click', () => { appWindow.close(); });
        }
    }

    const tutorialToggle = document.getElementById('tutorial-toggle');
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    if (tutorialToggle && tutorialOverlay) {
        tutorialToggle.addEventListener('click', () => {
            tutorialOverlay.classList.remove('hidden');
            setTimeout(() => tutorialOverlay.classList.add('active'), 10);
            const tutorialFrame = document.getElementById('tutorial-modal-frame');
            if (tutorialFrame && tutorialFrame.contentWindow) {
                tutorialFrame.contentWindow.postMessage({ type: 'JUMP_TO_ABOUT' }, '*');
            }
        });

        tutorialOverlay.addEventListener('click', (e) => {
            if (e.target === tutorialOverlay) {
                tutorialOverlay.classList.remove('active');
                setTimeout(() => tutorialOverlay.classList.add('hidden'), 300);
            }
        });
    }

    // Global Zoom Logic
    let currentZoom = 1.0;
    const zoomInput = document.getElementById('global-zoom-input');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');

    function applyZoom(newZoom) {
        if (isNaN(newZoom)) return;
        currentZoom = Math.max(0.25, Math.min(newZoom, 3.0)); // limit between 25% and 300%
        
        // 80% is the new 100% baseline, so we multiply display zoom by 0.8
        const actualCssZoom = currentZoom * 0.8;
        
        document.documentElement.style.setProperty('--app-zoom', actualCssZoom);
        if (zoomInput) {
            zoomInput.value = Math.round(currentZoom * 100) + '%';
        }
    }

    if (zoomInput) {
        zoomInBtn.addEventListener('click', () => {
            applyZoom(currentZoom + 0.1);
        });

        zoomOutBtn.addEventListener('click', () => {
            applyZoom(currentZoom - 0.1);
        });

        zoomInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                zoomInput.blur();
            }
        });

        zoomInput.addEventListener('blur', (e) => {
            let val = e.target.value.replace('%', '').trim();
            let parsed = parseFloat(val);
            if (!isNaN(parsed)) {
                applyZoom(parsed / 100);
            } else {
                zoomInput.value = Math.round(currentZoom * 100) + '%';
            }
        });
        
        // Apply default zoom on load
        applyZoom(currentZoom);
    }

    // --- License Logic ---
    const isTauri = window.__TAURI__ !== undefined;
    let isLicensed = false;
    const licenseBadge = document.getElementById('shell-license-badge');
    
    if (licenseBadge) {
        licenseBadge.style.cursor = 'pointer';
        licenseBadge.addEventListener('click', () => {
            if (!isTauri) {
                window.open('https://www.dscript.org/dscriptor', '_blank');
                return;
            }
            
            const overlay = document.getElementById('tutorial-overlay');
            if (overlay) {
                overlay.classList.remove('hidden');
                setTimeout(() => overlay.classList.add('active'), 10);
            }
            const tutorialFrame = document.getElementById('tutorial-modal-frame');
            if (tutorialFrame && tutorialFrame.contentWindow) {
                if (isLicensed) {
                    tutorialFrame.contentWindow.postMessage({ type: 'JUMP_TO_ABOUT' }, '*');
                } else {
                    tutorialFrame.contentWindow.postMessage({ type: 'JUMP_TO_LICENSE' }, '*');
                }
            }
        });
    }

    function updateLicenseUI(status) {
        isLicensed = status;
        if (licenseBadge) {
            licenseBadge.style.display = 'inline-block';
            if (!isTauri) {
                licenseBadge.textContent = 'DOWNLOAD';
                licenseBadge.style.background = '#10b981';
                licenseBadge.style.color = '#000';
            } else if (isLicensed) {
                licenseBadge.textContent = 'LICENSED';
                licenseBadge.style.background = '#10b981';
                licenseBadge.style.color = '#fff';
            } else {
                licenseBadge.textContent = 'UNLICENSED';
                licenseBadge.style.background = '#ef4444';
                licenseBadge.style.color = '#fff';
            }
        }
        
        frames.forEach(f => {
            if (f.contentWindow) {
                f.contentWindow.postMessage({ type: 'LICENSE_STATUS', isLicensed }, '*');
            }
        });
        
        const tutorialFrame = document.getElementById('tutorial-modal-frame');
        if (tutorialFrame && tutorialFrame.contentWindow) {
            tutorialFrame.contentWindow.postMessage({ type: 'LICENSE_STATUS', isLicensed }, '*');
        }
    }

    // --- First Run Logic ---
    const introOverlay = document.getElementById('intro-overlay');
    const dismissIntroBtn = document.getElementById('dismiss-intro-btn');
    const mobileWarning = document.getElementById('mobile-warning');

    if (mobileWarning) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            mobileWarning.style.display = 'block';
        }
    }

    if (introOverlay && dismissIntroBtn) {
        // Shared dismiss handler
        dismissIntroBtn.addEventListener('click', () => {
            introOverlay.classList.remove('active');
            setTimeout(() => introOverlay.classList.add('hidden'), 300);
            
            if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
                // Mark complete in backend
                window.__TAURI__.core.invoke('mark_first_run_complete').catch(err => console.error("Failed to mark first run complete", err));
            }
        });
    }

    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
        window.__TAURI__.core.invoke('check_local_license').then(status => {
            updateLicenseUI(status);
        }).catch(err => console.error("License check error:", err));

        if (introOverlay) {
            // Check if first run natively
            window.__TAURI__.core.invoke('check_first_run').then(isFirstRun => {
                if (isFirstRun) {
                    introOverlay.classList.add('active');
                    introOverlay.classList.remove('hidden');
                }
            }).catch(err => console.error("First run check error:", err));
        }
    } else {
        updateLicenseUI(false);
        // Web version always shows intro
        if (introOverlay) {
            introOverlay.classList.add('active');
            introOverlay.classList.remove('hidden');
        }
    }
    // ----------------------

    // Tab Translations Dictionary
    const tabTranslations = {
        'en': { editor: ['Genesis', 'Editor'], fontshop: ['Codex', 'Fonts'], scribepad: ['Scribe', 'Text'], stamper: ['Stamper', 'Asset Stamping'], sculptor: ['Sculptor', 'Sculpting'], carver: ['Carver', '3D Alpha'], filters: ['Filters', 'Filters'], thedeep: ['The Deep', 'Beyond Fonts'] },
        'fr': { editor: ['Genèse', 'Éditeur'], fontshop: ['Codex', 'Polices'], scribepad: ['Scribe', 'Texte'], stamper: ['Sceau', 'Estampage'], sculptor: ['Sculpteur', 'Sculpture'], carver: ['Graveur', 'Alpha 3D'], filters: ['Filtres', 'Filtres'], thedeep: ['Les Profondeurs', 'Au-delà des Polices'] },
        'es': { editor: ['Génesis', 'Editor'], fontshop: ['Códice', 'Fuentes'], scribepad: ['Escriba', 'Texto'], stamper: ['Sello', 'Estampado'], sculptor: ['Escultor', 'Esculpido'], carver: ['Tallador', 'Alfa 3D'], filters: ['Filtros', 'Filtros'], thedeep: ['Las Profundidades', 'Más Allá de las Fuentes'] },
        'zh': { editor: ['创世', '编辑器'], fontshop: ['典籍', '字体'], scribepad: ['书吏', '文本'], stamper: ['刻印', '资产印花'], sculptor: ['塑者', '3D雕刻'], carver: ['雕工', '3D Alpha'], filters: ['滤镜', '滤镜'], thedeep: ['深渊', '字体之外'] },
        'ja': { editor: ['創世', 'エディタ'], fontshop: ['写本', 'フォント'], scribepad: ['書記', 'テキスト'], stamper: ['刻印', 'スタンプ'], sculptor: ['彫刻家', 'スカルプト'], carver: ['彫師', '3Dアルファ'], filters: ['フィルター', 'フィルター'], thedeep: ['深淵', 'フォントを超えて'] },
        'ko': { editor: ['창세기', '에디터'], fontshop: ['고문서', '폰트'], scribepad: ['필경사', '텍스트'], stamper: ['스탬퍼', '에셋 스탬핑'], sculptor: ['조각가', '스컬프팅'], carver: ['카버', '3D 알파'], filters: ['필터', '필터'], thedeep: ['심연', '폰트 그 너머'] },
        'ru': { editor: ['Генезис', 'Редактор'], fontshop: ['Кодекс', 'Шрифты'], scribepad: ['Писец', 'Текст'], stamper: ['Печать', 'Штамповка'], sculptor: ['Скульптор', 'Скульптинг'], carver: ['Резчик', '3D Альфа'], filters: ['Фильтры', 'Фильтры'], thedeep: ['Глубины', 'За Пределами Шрифтов'] },
        'de': { editor: ['Genesis', 'Editor'], fontshop: ['Kodex', 'Schriftarten'], scribepad: ['Skribent', 'Text'], stamper: ['Präger', 'Prägung'], sculptor: ['Bildhauer', 'Sculpting'], carver: ['Schnitzer', '3D-Alpha'], filters: ['Filter', 'Filter'], thedeep: ['Die Tiefe', 'Jenseits von Schriftarten'] },
        'pl': { editor: ['Geneza', 'Edytor'], fontshop: ['Kodeks', 'Czcionki'], scribepad: ['Skryba', 'Tekst'], stamper: ['Stempel', 'Stemplowanie'], sculptor: ['Rzeźbiarz', 'Rzeźbienie'], carver: ['Grawer', 'Alfa 3D'], filters: ['Filtry', 'Filtry'], thedeep: ['Głębia', 'Poza Czcionkami'] },
        'uk': { editor: ['Генезис', 'Редактор'], fontshop: ['Кодекс', 'Шрифти'], scribepad: ['Писар', 'Текст'], stamper: ['Печатка', 'Штампування'], sculptor: ['Скульптор', 'Скульптинг'], carver: ['Різьбяр', '3D Альфа'], filters: ['Фільтри', 'Фільтри'], thedeep: ['Глибини', 'За Межами Шрифтів'] },
        'it': { editor: ['Genesi', 'Editor'], fontshop: ['Codice', 'Font'], scribepad: ['Scriba', 'Testo'], stamper: ['Sigillo', 'Stampaggio'], sculptor: ['Scultore', 'Scultura'], carver: ['Intagliatore', 'Alpha 3D'], filters: ['Filtri', 'Filtri'], thedeep: ['Gli Abissi', 'Oltre i Font'] },
        'pt': { editor: ['Gênesis', 'Editor'], fontshop: ['Códice', 'Fontes'], scribepad: ['Escriba', 'Texto'], stamper: ['Selo', 'Estampagem'], sculptor: ['Escultor', 'Escultura'], carver: ['Entalhador', 'Alpha 3D'], filters: ['Filtros', 'Filtros'], thedeep: ['As Profundezas', 'Além das Fontes'] },
        'hi': { editor: ['उत्पत्ति', 'संपादक'], fontshop: ['संहिता', 'फ़ॉन्ट'], scribepad: ['मुंशी', 'टेक्स्ट'], stamper: ['मुहर', 'एसेट स्टैम्पिंग'], sculptor: ['मूर्तिकार', 'मूर्तिकला'], carver: ['नक्काशी', '3D अल्फा'], filters: ['फ़िल्टर', 'फ़िल्टर'], thedeep: ['गहराई', 'फ़ॉन्ट के पार'] },
        'ar': { editor: ['التكوين', 'المحرر'], fontshop: ['المخطوطة', 'الخطوط'], scribepad: ['الكاتب', 'النص'], stamper: ['الختم', 'ختم الأصول'], sculptor: ['النحات', 'النحت'], carver: ['النقاش', 'ألفا 3D'], filters: ['فلاتر', 'فلاتر'], thedeep: ['الأعماق', 'ما وراء الخطوط'] },
        'bn': { editor: ['জেনেসিস', 'এডিটর'], fontshop: ['কোডেক্স', 'ফন্ট'], scribepad: ['লিপিকার', 'টেক্সট'], stamper: ['স্ট্যাম্পার', 'অ্যাসেট স্ট্যাম্প'], sculptor: ['ভাস্কর', 'স্কাল্পটিং'], carver: ['খোদাইকার', '3D আলফা'], filters: ['ফিল্টার', 'ফিল্টার'], thedeep: ['গভীরতা', 'ফন্টের বাইরে'] },
        'ur': { editor: ['تکوین', 'ایڈیٹر'], fontshop: ['مخطوطہ', 'فونٹس'], scribepad: ['کاتب', 'متن'], stamper: ['مہر', 'ایسٹ سٹیمپنگ'], sculptor: ['مجسمہ ساز', 'مجسمہ سازی'], carver: ['نقاش', 'تھری ڈی الفا'], filters: ['فلٹرز', 'فلٹرز'], thedeep: ['گہرائی', 'فونٹس سے آگے'] },
        'id': { editor: ['Genesis', 'Editor'], fontshop: ['Kodeks', 'Font'], scribepad: ['Juru Tulis', 'Teks'], stamper: ['Stempel', 'Stempel Aset'], sculptor: ['Pematung', 'Pemahatan'], carver: ['Pengukir', 'Alpha 3D'], filters: ['Filter', 'Filter'], thedeep: ['Kedalaman', 'Di Luar Font'] },
        'mr': { editor: ['उत्पत्ती', 'संपादक'], fontshop: ['संहिता', 'फॉन्ट'], scribepad: ['लिपिक', 'मजकूर'], stamper: ['मुद्रा', 'ॲसेट स्टॅम्पिंग'], sculptor: ['शिल्पकार', 'शिल्पकला'], carver: ['नक्षीकार', '3D अल्फा'], filters: ['फिल्टर', 'फिल्टर'], thedeep: ['खोली', 'फॉन्टच्या पलीकडे'] },
        'te': { editor: ['సృష్టి', 'ఎడిటర్'], fontshop: ['గ్రంథం', 'ఫాంట్లు'], scribepad: ['లేఖరి', 'వచనం'], stamper: ['స్టాంప్', 'అసెట్ స్టాంపింగ్'], sculptor: ['శిల్పి', 'శిల్పకళ'], carver: ['చెక్కేవాడు', '3D ఆల్ఫా'], filters: ['ఫిల్టర్లు', 'ఫిల్టర్లు'], thedeep: ['లోతులు', 'ఫాంట్‌లకు మించి'] }
    };

    function updateTabLabels(lang) {
        const trans = tabTranslations[lang] || tabTranslations['en'];
        tabs.forEach(tab => {
            const targetId = tab.getAttribute('data-target');
            const data = trans[targetId] || tabTranslations['en'][targetId];
            if (data) {
                const titleSpan = tab.querySelector('.tab-title');
                const subtitleSpan = tab.querySelector('.tab-subtitle');
                if (titleSpan) titleSpan.textContent = data[0];
                if (subtitleSpan) subtitleSpan.textContent = data[1];
            }
        });
    }

    // Language Switcher Logic
    let currentLanguage = 'en';

    async function loadLanguage(lang) {
        try {
            const response = await fetch(`../assets/i18n/shell_${lang}.json`);
            if (response.ok) {
                const translations = await response.json();
                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    if (translations[key]) {
                        el.innerHTML = translations[key];
                    }
                });
            }
        } catch (err) {
            console.error("Failed to load language", lang, err);
        }
    }

    const languageSwitcher = document.getElementById('language-switcher');
    if (languageSwitcher) {
        languageSwitcher.addEventListener('change', (e) => {
            const selectedLanguage = e.target.value;
            currentLanguage = selectedLanguage;
            loadLanguage(selectedLanguage);
            frames.forEach(f => {
                if (f.contentWindow) {
                    f.contentWindow.postMessage({
                        type: 'LANGUAGE_CHANGED',
                        language: selectedLanguage
                    }, '*');
                }
            });
            const tutorialFrame = document.getElementById('tutorial-modal-frame');
            if (tutorialFrame && tutorialFrame.contentWindow) {
                tutorialFrame.contentWindow.postMessage({ type: 'LANGUAGE_CHANGED', language: selectedLanguage }, '*');
            }
        });
        
        // Initial load
        loadLanguage(languageSwitcher.value);
    }

    // Initialize with default
    updateTabLabels(currentLanguage);

    // The Deep Overlay Logic
    const theDeepOverlay = document.getElementById('thedeep-overlay');
    const theDeepEnterBtn = document.getElementById('thedeep-enter-btn');
    if (theDeepEnterBtn && theDeepOverlay) {
        theDeepEnterBtn.addEventListener('click', () => {
            theDeepOverlay.style.opacity = '0';
            setTimeout(() => {
                theDeepOverlay.style.display = 'none';
            }, 400); // Wait for transition
        });
    }

    function switchTab(targetId) {
        // Update Tabs
        tabs.forEach(t => t.classList.remove('active'));
        const targetTab = document.querySelector(`.tab-button[data-target="${targetId}"]`);
        if (targetTab) targetTab.classList.add('active');

        // Update Frames
        frames.forEach(f => f.classList.remove('active'));
        const targetFrame = document.getElementById(`${targetId}-frame`);
        if (targetFrame) {
            targetFrame.classList.add('active');
            // Notify the frame that it just became visible
            if (targetFrame.contentWindow) {
                targetFrame.contentWindow.postMessage({ type: 'TAB_ACTIVATED' }, '*');
            }
        }
    }

    // Inter-Tool Communication (The Event Bus)
    let lastScribePreview = null;
    window.addEventListener('message', (event) => {
        // --- License Comms ---
        if (event.data && event.data.type === 'REQUEST_LICENSE_STATUS') {
            if (event.source) {
                event.source.postMessage({ type: 'LICENSE_STATUS', isLicensed }, '*');
            }
            return;
        }
        if (event.data && event.data.type === 'ACTIVATE_LICENSE') {
            if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
                window.__TAURI__.core.invoke('activate_license', { key: event.data.key }).then(success => {
                    if (success) {
                        updateLicenseUI(true);
                    }
                }).catch(err => {
                    if (event.source) {
                        event.source.postMessage({ type: 'ACTIVATE_ERROR', error: err }, '*');
                    }
                });
            } else {
                updateLicenseUI(true); // Web fallback
            }
            return;
        }

        // Route FontShop state updates to the Editor
        if (event.data && event.data.type === 'FONTSHOP_STATE') {
            const editorFrame = document.getElementById('editor-frame');
            if (editorFrame && editorFrame.contentWindow) {
                editorFrame.contentWindow.postMessage(event.data, '*');
            }
            return;
        }

        // Route Global Archive updates to ScribePad
        if (event.data && event.data.type === 'GLOBAL_ARCHIVE_UPDATED') {
            const scribeFrame = document.getElementById('scribepad-frame');
            if (scribeFrame && scribeFrame.contentWindow) {
                scribeFrame.contentWindow.postMessage(event.data, '*');
            }
            return;
        }

        // --- ScribePad Canvas Preview Bridge ---
        if (event.data && event.data.type === 'SCRIBE_CANVAS_PREVIEW') {
            lastScribePreview = event.data;
            // Broadcast to all other iframes
            frames.forEach(f => {
                if (f.id !== 'scribepad-frame' && f.contentWindow) {
                    f.contentWindow.postMessage(event.data, '*');
                }
            });
            return;
        }
        if (event.data && event.data.type === 'REQUEST_SCRIBE_PREVIEW') {
            if (lastScribePreview && event.source) {
                event.source.postMessage(lastScribePreview, '*');
            }
            return;
        }
        if (event.data && (event.data.type === 'REQUEST_SCRIBE_EXPORT_FOR_SCULPTOR' || event.data.type === 'REQUEST_SCRIBE_EXPORT_FOR_STAMPER' || event.data.type === 'REQUEST_SCRIBE_EXPORT_FOR_CARVER')) {
            const scribeFrame = document.getElementById('scribepad-frame');
            if (scribeFrame && scribeFrame.contentWindow) {
                scribeFrame.contentWindow.postMessage(event.data, '*');
            }
            return;
        }

        // --- ScribePad Popup Communication Bridge ---
        if (event.data && event.data.type === 'REQUEST_EDITOR_STATUS') {
            const editorFrame = document.getElementById('editor-frame');
            if (editorFrame && editorFrame.contentWindow) {
                editorFrame.contentWindow.postMessage(event.data, '*');
            }
            return;
        }
        if (event.data && event.data.type === 'EDITOR_STATUS') {
            const scribeFrame = document.getElementById('scribepad-frame');
            if (scribeFrame && scribeFrame.contentWindow) {
                scribeFrame.contentWindow.postMessage(event.data, '*');
            }
            const fontshopFrame = document.getElementById('fontshop-frame');
            if (fontshopFrame && fontshopFrame.contentWindow) {
                fontshopFrame.contentWindow.postMessage(event.data, '*');
            }
            return;
        }
        if (event.data && event.data.type === 'REQUEST_PULL_FROM_EDITOR') {
            const editorFrame = document.getElementById('editor-frame');
            if (editorFrame && editorFrame.contentWindow) {
                editorFrame.contentWindow.postMessage({ type: 'PULL_FROM_EDITOR' }, '*');
            }
            return;
        }
        if (event.data && event.data.type === 'FORCE_PUSH_TO_FONTSHOP') {
            const editorFrame = document.getElementById('editor-frame');
            if (editorFrame && editorFrame.contentWindow) {
                editorFrame.contentWindow.postMessage(event.data, '*');
            }
            return;
        }

        // --- Carver <-> Stamper Texture Grab Bridge ---
        if (event.data && event.data.type === 'STAMPER_COPY_STATUS') {
            const carverFrame = document.getElementById('carver-frame');
            if (carverFrame && carverFrame.contentWindow) {
                carverFrame.contentWindow.postMessage(event.data, '*');
            }
            return;
        }
        if (event.data && event.data.type === 'REQUEST_COPIED_TEXTURE') {
            const stamperFrame = document.getElementById('stamper-frame');
            if (stamperFrame && stamperFrame.contentWindow) {
                stamperFrame.contentWindow.postMessage(event.data, '*');
            }
            return;
        }
        if (event.data && event.data.type === 'COPIED_TEXTURE_RESPONSE') {
            const carverFrame = document.getElementById('carver-frame');
            if (carverFrame && carverFrame.contentWindow) {
                carverFrame.contentWindow.postMessage(event.data, '*');
            }
            return;
        }

        // --- Tutorial Modal Close ---
        if (event.data && event.data.type === 'CLOSE_TUTORIAL') {
            const overlay = document.getElementById('tutorial-overlay');
            if (overlay) {
                overlay.classList.remove('active');
                setTimeout(() => overlay.classList.add('hidden'), 300);
            }
            return;
        }

        // --- Open External URL ---
        if (event.data && event.data.type === 'OPEN_EXTERNAL_URL') {
            const url = event.data.url;
            try {
                if (window.__TAURI__ && window.__TAURI__.shell && window.__TAURI__.shell.open) {
                    window.__TAURI__.shell.open(url);
                } else if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
                    window.__TAURI_INTERNALS__.invoke('plugin:shell|open', { path: url, with: null });
                } else {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            } catch (err) {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
            return;
        }

        // --- Global Save Handler ---
        if (event.data && event.data.type === 'GLOBAL_SAVE') {
            const { filename, fileData } = event.data;
            
            const fallbackSave = (name, data) => {
                let downloadUrl = data;
                
                // If it's a data URL, try to convert to Blob URL to avoid length limits
                if (typeof data === 'string' && data.startsWith('data:')) {
                    try {
                        const parts = data.split(',');
                        const mime = parts[0].match(/:(.*?);/)[1];
                        const bstr = atob(parts[1]);
                        let n = bstr.length;
                        const u8arr = new Uint8Array(n);
                        while (n--) {
                            u8arr[n] = bstr.charCodeAt(n);
                        }
                        const blob = new Blob([u8arr], { type: mime });
                        downloadUrl = URL.createObjectURL(blob);
                    } catch (e) {
                        console.warn('Failed to convert data URL to Blob', e);
                    }
                } 
                // If it doesn't start with data:, blob:, or http, it's raw text/svg content
                else if (typeof data === 'string' && !data.startsWith('blob:') && !data.startsWith('http')) {
                    const type = name.endsWith('.svg') ? 'image/svg+xml' : 'text/plain';
                    const blob = new Blob([data], { type });
                    downloadUrl = URL.createObjectURL(blob);
                }

                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Cleanup Blob URL
                if (downloadUrl.startsWith('blob:')) {
                    setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
                }
            };

            try {
                if (window.__TAURI__ && window.__TAURI__.dialog && window.__TAURI__.dialog.save) {
                    // It's Tauri, prompt native save dialogue
                    window.__TAURI__.dialog.save({
                        defaultPath: filename,
                    }).then(async (savePath) => {
                        if (savePath && window.__TAURI__.fs) {
                            // Write directly via Tauri FS
                            let rawData = fileData;
                            let isBinary = false;
                            
                            if (fileData.startsWith('data:')) {
                                rawData = fileData.split(',')[1];
                                isBinary = true;
                            }
                            
                            if (isBinary && window.__TAURI__.fs.writeBinaryFile) {
                                const binaryString = atob(rawData);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) {
                                    bytes[i] = binaryString.charCodeAt(i);
                                }
                                await window.__TAURI__.fs.writeBinaryFile(savePath, bytes);
                            } else if (window.__TAURI__.fs.writeTextFile) {
                                await window.__TAURI__.fs.writeTextFile(savePath, fileData);
                            } else {
                                fallbackSave(filename, fileData);
                            }
                        }
                    }).catch(err => {
                        console.error('Tauri save failed:', err);
                        fallbackSave(filename, fileData);
                    });
                } else {
                    // Standard Web Browser Fallback
                    fallbackSave(filename, fileData);
                }
            } catch (err) {
                console.error('Global save error:', err);
                fallbackSave(filename, fileData);
            }
            return;
        }

        // --- Language Bridge ---
        if (event.data && event.data.type === 'REQUEST_LANGUAGE') {
            if (event.source) {
                event.source.postMessage({ type: 'LANGUAGE_CHANGED', language: currentLanguage }, '*');
            }
            return;
        }
        // ---------------------------------------------

        // Handle TRANSITION requests
        if (event.data && event.data.type === 'TRANSITION') {
            console.log(`[Shell] Received transition request to ${event.data.target}`);
            
            // Switch the UI to the target tab
            switchTab(event.data.target);

            // Forward the raw payload blob down into the target IFrame
            const targetFrame = document.getElementById(`${event.data.target}-frame`);
            if (targetFrame && targetFrame.contentWindow) {
                // We add a tiny delay to ensure the browser has rendered the iframe if it was hidden
                setTimeout(() => {
                    targetFrame.contentWindow.postMessage(event.data.payload, '*');
                    
                    // IF there is an autoForwardTarget, also send a special configuration message
                    if (event.data.autoForwardTarget) {
                        targetFrame.contentWindow.postMessage({
                            type: 'SET_AUTO_FORWARD',
                            target: event.data.autoForwardTarget
                        }, '*');
                    }
                }, 100);
            }
        }
    });
});
