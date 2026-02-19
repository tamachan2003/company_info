document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const suggestionsList = document.getElementById('suggestions-list');
    const resultContainer = document.getElementById('result-container');
    const companyNameEl = document.getElementById('company-name');
    const companyCodeEl = document.getElementById('company-code');
    const xLink = document.getElementById('x-link');
    const tdnetLink = document.getElementById('tdnet-link');
    const yahooLink = document.getElementById('yahoo-link');
    const googleLink = document.getElementById('google-link');
    const btnOpenAll = document.getElementById('btn-open-all');
    const searchButton = document.getElementById('search-button');
    const toast = document.getElementById('toast');
    const historyToggle = document.getElementById('history-toggle');
    const historyList = document.getElementById('history-list');
    const sortRadios = document.querySelectorAll('input[name="sort-order"]');

    let currentCompany = null;
    let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    let currentSortOrder = 'recent'; // 'recent' or 'alpha'

    // Initial load
    renderHistoryList();

    // Toggle History List
    historyToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        historyList.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        historyList.classList.add('hidden');
    });

    historyList.addEventListener('click', (e) => {
        e.stopPropagation();
    });


    // Handle Sort Order Change
    sortRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentSortOrder = e.target.value;
            renderHistoryList();
        });
    });

    function renderHistoryList() {
        historyList.innerHTML = '';

        if (searchHistory.length === 0) {
            historyList.innerHTML = '<div class="history-item" style="color: #64748b; cursor: default;">履歴がありません</div>';
            return;
        }

        let sortedHistory = [...searchHistory];
        if (currentSortOrder === 'alpha') {
            sortedHistory.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        }

        sortedHistory.forEach(company => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <span class="item-name">${company.name}</span>
                <span class="item-code">${company.code}</span>
            `;

            // Click to select
            div.addEventListener('click', () => {
                selectCompany(company);
                historyList.classList.add('hidden');
            });

            // Right-click to delete
            div.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (confirm(`履歴から「${company.name}」を削除しますか？`)) {
                    removeFromHistory(company.code);
                }
            });

            historyList.appendChild(div);
        });
    }

    function removeFromHistory(code) {
        searchHistory = searchHistory.filter(c => c.code !== code);
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
        renderHistoryList();
        showToast('履歴から削除しました。');
    }

    function addToHistory(company) {
        // Remove if already exists to move to top
        searchHistory = searchHistory.filter(c => c.code !== company.code);
        // Add to the beginning
        searchHistory.unshift({
            code: company.code,
            name: company.name
        });

        // Keep only top 20
        if (searchHistory.length > 20) {
            searchHistory.pop();
        }

        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
        renderHistoryList();
    }

    // Handle Search Button Click
    searchButton.addEventListener('click', () => {
        executeSearch();
    });

    // Enter Key Search Support
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            executeSearch();
        }
    });

    function executeSearch() {
        const query = searchInput.value.toLowerCase().trim();
        if (query.length === 0) return;

        // Find match with priority: Exact > Partial
        const exactMatch = companies.find(c => c.name === query || c.code === query);
        const partialMatch = companies.find(c => c.name.includes(query) || c.code.includes(query));

        const match = exactMatch || partialMatch;

        if (match) {
            selectCompany(match);
        } else {
            showToast(`「${query}」に一致する銘柄が見つかりませんでした。`);
        }
    }

    // Filter companies based on input
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        if (query.length === 0) {
            suggestionsList.style.display = 'none';
            return;
        }

        const filtered = companies.filter(company => {
            return company.name.includes(query) || company.code.includes(query);
        });

        renderSuggestions(filtered);
    });

    // Render suggestion items
    function renderSuggestions(list) {
        suggestionsList.innerHTML = '';

        if (list.length === 0) {
            suggestionsList.style.display = 'none';
            return;
        }

        list.forEach(company => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <span class="suggestion-name">${company.name}</span>
                <span class="suggestion-code">${company.code}</span>
            `;
            div.addEventListener('click', () => {
                selectCompany(company);
            });
            suggestionsList.appendChild(div);
        });

        suggestionsList.style.display = 'block';
    }

    // Handle company selection
    function selectCompany(company) {
        currentCompany = company; // Update current company
        searchInput.value = company.name;
        suggestionsList.style.display = 'none';

        // Update History
        addToHistory(company);

        // Update UI info
        companyNameEl.textContent = company.name;
        companyCodeEl.textContent = `Code: ${company.code}`;

        // Update X Link
        const xQuery = encodeURIComponent(company.name);
        xLink.href = `https://twitter.com/search?q=${xQuery}&src=typed_query&f=live`;

        // Update TDnet Link
        tdnetLink.href = `https://www.release.tdnet.info/index.html`;

        // Add click listener for TDnet
        tdnetLink.onclick = (e) => {
            copyToClipboard(company.name);
        };

        // Update Yahoo Finance Link
        yahooLink.href = `https://finance.yahoo.co.jp/quote/${company.code}.T`;

        // Update Google Search Link
        const gQuery = encodeURIComponent(company.name);
        googleLink.href = `https://www.google.com/search?q=${gQuery}`;

        // 重要: 選択した瞬間にコピー
        copyToClipboard(company.name);

        // Show result
        resultContainer.classList.remove('hidden');
    }

    // Open All Links Handler
    btnOpenAll.addEventListener('click', () => {
        if (!currentCompany) return;

        // 1. まずコピーを確実に実行
        copyToClipboard(currentCompany.name);

        // 2. ブラウザのポップアップブロック対策として、直接開く
        // (ユーザーのアクション内なので、複数個までは許可されるケースが多い)
        const tabs = [
            yahooLink.href,
            xLink.href,
            tdnetLink.href,
            googleLink.href
        ];

        tabs.forEach((url, index) => {
            setTimeout(() => {
                window.open(url, '_blank');
            }, index * 400); // 400ms間隔で開く
        });
    });

    function copyToClipboard(text) {
        // フォールバック付きのコピー処理
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                showToast(`「${text}」をコピーしました。TDnetの検索窓でCtrl+Vを押してください。`);
            }, (err) => {
                fallbackCopyTextToClipboard(text);
            });
        } else {
            fallbackCopyTextToClipboard(text);
        }
    }

    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // 画面外に配置
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast(`「${text}」をコピーしました。TDnetの検索窓でCtrl+Vを押してください。`);
            }
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }

        document.body.removeChild(textArea);
    }

    function showToast(message) {
        toast.className = "show";
        toast.textContent = message;
        // 表示時間を少し長めに (5秒)
        clearTimeout(toast.timeoutId);
        toast.timeoutId = setTimeout(function () {
            toast.className = toast.className.replace("show", "");
        }, 5000);
    }

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsList.contains(e.target)) {
            suggestionsList.style.display = 'none';
        }
    });
});
