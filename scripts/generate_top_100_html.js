const fs = require('fs');
const path = require('path');

const ANIME_DIR = path.join(__dirname, '../web/anime');
const BASE_WEBSITE_DIR = path.join(__dirname, '../web');

// Helper to extract meta content
function extractOgImage(html) {
    const ogMatch = html.match(/<meta property="og:image" content="([^"]*)"/);
    if (ogMatch) return ogMatch[1];

    const imgMatch = html.match(/<img src="([^"]*)"[^>]*class="anime-poster"/);
    return imgMatch ? imgMatch[1] : '';
}

function extractTitle(html) {
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    if (!titleMatch) return 'Unknown Anime';
    return titleMatch[1].replace(' - Track on MyAnimeDex', '').trim();
}

function extractScore(html) {
    const match = html.match(/<ion-icon name="star"><\/ion-icon>\s*([\d\.]+)/);
    return match ? match[1] : null;
}

function generateAnimeCard(slug, title, image, score) {
    return `
            <a href="./${slug}/index.html" class="anime-card-link">
                <div class="anime-card">
                    <div class="card-image-wrapper">
                        <img src="${image}" alt="${title}" loading="lazy">
                        ${score ? `<div class="card-score"><ion-icon name="star"></ion-icon> ${score}</div>` : ''}
                    </div>
                    <div class="card-content">
                        <h3>${title}</h3>
                    </div>
                </div>
            </a>`;
}

// Language Translations Config
const languages = {
    en: {
        file: 'index.html',
        langCode: 'en',
        title: 'Top 100 Anime - MyAnimeDex',
        description: 'Browse the Top 100 Anime on MyAnimeDex. Track your progress, verify scores, and find your next favorite series.',
        keywords: 'top 100 anime, anime rankings, best anime, top rated anime, myanimedex',
        backHome: 'Home',
        homeLink: '../index.html',
        privacyLink: '../privacy.html',
        deleteAccountLink: '../delete-account.html',
        topAnimeLink: '../anime/index.html',
        features: 'Features',
        about: 'About',
        privacy: 'Privacy Policy',
        download: 'Download App',
        deleteAccount: 'Delete Account',
        contact: 'Contact',
        heroTitle: 'Top 100 <span class="accent">Anime</span>',
        heroSubtitle: 'The highest rated anime as tracked by our community. Discover your next obsession.',
        followUs: 'Follow us',
        followText: 'We are on social media! Let’s stay in touch.',
        madeWith: 'Made with ❤️ for anime fans.',
        allRights: 'MyAnimeDex. All rights reserved.',
        navLabel: 'EN'
    },
    tr: {
        file: 'index_tr.html',
        langCode: 'tr',
        title: 'Top 100 Anime - MyAnimeDex',
        description: 'MyAnimeDex\'teki En İyi 100 Animeye göz atın. İlerlemenizi takip edin, puanları doğrulayın ve bir sonraki favori serinizi bulun.',
        keywords: 'en iyi 100 anime, anime sıralaması, en iyi animeler, popüler anime, myanimedex',
        backHome: 'Anasayfa',
        homeLink: '../tr.html',
        privacyLink: '../privacy_tr.html',
        deleteAccountLink: '../delete-account_tr.html',
        topAnimeLink: '../anime/index_tr.html',
        features: 'Özellikler',
        about: 'Hakkında',
        privacy: 'Gizlilik Politikası',
        download: 'Uygulamayı İndir',
        deleteAccount: 'Hesabı Sil',
        contact: 'İletişim',
        heroTitle: 'Top 100 <span class="accent">Anime</span>',
        heroSubtitle: 'Topluluğumuz tarafından takip edilen en yüksek puanlı animeler. Bir sonraki tutkunuzu keşfedin.',
        followUs: 'Bizi takip et',
        followText: 'Sosyal medyadayız! İletişimde kalalım.',
        madeWith: 'Anime hayranları için ❤️ ile yapıldı.',
        allRights: 'MyAnimeDex. Tüm hakları saklıdır.',
        navLabel: 'TR'
    },
    jp: {
        file: 'index_jp.html',
        langCode: 'ja',
        title: 'トップ100アニメ - MyAnimeDex',
        description: 'MyAnimeDexでトップ100のアニメを閲覧。進捗状況を追跡し、スコアを確認し、次のお気に入りのシリーズを見つけましょう。',
        keywords: 'トップ100アニメ, アニメランキング, 人気アニメ, おすすめアニメ, myanimedex',
        backHome: 'ホーム',
        homeLink: '../jp.html',
        privacyLink: '../privacy_jp.html',
        deleteAccountLink: '../delete-account_jp.html',
        topAnimeLink: '../anime/index_jp.html',
        features: '特徴',
        about: '概要',
        privacy: 'プライバシーポリシー',
        download: 'アプリをダウンロード',
        deleteAccount: 'アカウント削除',
        contact: 'お問い合わせ',
        heroTitle: 'トップ100 <span class="accent">アニメ</span>',
        heroSubtitle: 'コミュニティによって追跡された最高評価のアニメ。次のお気に入りを見つけよう。',
        followUs: 'フォローする',
        followText: 'ソーシャルメディアにいます！連絡を取り合いましょう。',
        madeWith: 'アニメファンのために ❤️ で作られました。',
        allRights: 'MyAnimeDex. 全著作権所有。',
        navLabel: 'JP'
    },
    id: {
        file: 'index_id.html',
        langCode: 'id',
        title: '100 Anime Teratas - MyAnimeDex',
        description: 'Jelajahi 100 Anime Teratas di MyAnimeDex. Lacak kemajuan Anda, verifikasi skor, dan temukan seri favorit berikutnya.',
        keywords: 'top 100 anime, peringkat anime, anime terbaik, anime populer, myanimedex',
        backHome: 'Beranda',
        homeLink: '../id.html',
        privacyLink: '../privacy_id.html',
        deleteAccountLink: '../delete-account_id.html',
        topAnimeLink: '../anime/index_id.html',
        features: 'Fitur',
        about: 'Tentang',
        privacy: 'Kebijakan Privasi',
        download: 'Unduh Aplikasi',
        deleteAccount: 'Hapus Akun',
        contact: 'Kontak',
        heroTitle: '100 Anime <span class="accent">Teratas</span>',
        heroSubtitle: 'Anime dengan peringkat tertinggi yang dilacak oleh komunitas kami. Temukan obsesi Anda berikutnya.',
        followUs: 'Ikuti kami',
        followText: 'Kami ada di media sosial! Ayo tetap terhubung.',
        madeWith: 'Dibuat dengan ❤️ untuk penggemar anime.',
        allRights: 'MyAnimeDex. Hak cipta dilindungi undang-undang.',
        navLabel: 'ID'
    }
};

async function main() {
    console.log('Scanning anime directories...');

    if (!fs.existsSync(ANIME_DIR)) {
        console.error('Anime directory not found!');
        process.exit(1);
    }

    const entries = fs.readdirSync(ANIME_DIR, { withFileTypes: true });
    const animeList = [];

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const indexPath = path.join(ANIME_DIR, entry.name, 'index.html');
            if (fs.existsSync(indexPath)) {
                const html = fs.readFileSync(indexPath, 'utf-8');
                const title = extractTitle(html);
                const image = extractOgImage(html);
                const score = extractScore(html);

                animeList.push({
                    slug: entry.name,
                    title,
                    image,
                    score: score ? parseFloat(score) : 0
                });
            }
        }
    }

    // Sort by score descending
    animeList.sort((a, b) => b.score - a.score);
    console.log(`Found ${animeList.length} anime.`);

    // Generate page for each language
    for (const langKey of Object.keys(languages)) {
        const config = languages[langKey];
        const outputFilePath = path.join(ANIME_DIR, config.file);

        // Language Switcher Logic
        const langSwitcherHTML = `
            <div class="lang-dropdown">
                <span class="lang-current">${config.navLabel} <ion-icon name="chevron-down-outline"></ion-icon></span>
                <div class="lang-menu">
                    <a href="index.html" class="${langKey === 'en' ? 'active' : ''}">English</a>
                    <a href="index_tr.html" class="${langKey === 'tr' ? 'active' : ''}">Türkçe</a>
                    <a href="index_jp.html" class="${langKey === 'jp' ? 'active' : ''}">日本語</a>
                    <a href="index_id.html" class="${langKey === 'id' ? 'active' : ''}">Bahasa Indonesia</a>
                </div>
            </div>`;

        const mobileLangLinksHTML = `
            <div class="mobile-lang-links">
                <a href="index.html" class="${langKey === 'en' ? 'active' : ''}">English</a>
                <a href="index_tr.html" class="${langKey === 'tr' ? 'active' : ''}">Türkçe</a>
                <a href="index_jp.html" class="${langKey === 'jp' ? 'active' : ''}">日本語</a>
                <a href="index_id.html" class="${langKey === 'id' ? 'active' : ''}">Indonesia</a>
            </div>`;

        const pageContent = `<!DOCTYPE html>
<html lang="${config.langCode}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title}</title>
    <meta name="description" content="${config.description}">
    <meta name="keywords" content="${config.keywords}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../style.css">
    <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>

    <style>
        .top-hero {
            padding: 120px 20px 60px;
            text-align: center;
        }
        .top-hero h1 {
            font-size: 3rem;
            margin-bottom: 20px;
        }
        .anime-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 30px;
            max-width: 1200px;
            margin: 0 auto 100px;
            padding: 0 20px;
        }
        .anime-card-link {
            text-decoration: none;
            color: inherit;
        }
        .anime-card {
            background: var(--card-bg, #1A1A1A);
            border-radius: 16px;
            overflow: hidden;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            height: 100%;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .anime-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.3);
            border-color: var(--accent-color, #FACC15);
        }
        .card-image-wrapper {
            position: relative;
            padding-top: 140%; /* 5:7 aspect ratio approx */
            width: 100%;
        }
        .card-image-wrapper img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .card-score {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: #FACC15;
            padding: 4px 8px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
            backdrop-filter: blur(4px);
        }
        .card-content {
            padding: 16px;
        }
        .card-content h3 {
            font-size: 1rem;
            margin: 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.4;
        }
    </style>
</head>
<body>

    <!-- Header / Navbar -->
    <header class="navbar">
        <a href="${config.homeLink}" class="logo-link">
            <img src="../header-logo.png" alt="MyAnimeDex Logo" class="nav-logo">
            <span class="logo-text">MYANIME<span class="accent">DEX</span></span>
        </a>
        <nav class="desktop-nav">
            <a href="${config.homeLink}#features">${config.features}</a>
            <a href="${config.homeLink}#about">${config.about}</a>
            <a href="${config.privacyLink}">${config.privacy}</a>
            
            ${langSwitcherHTML}

            <a href="${config.homeLink}#download" class="btn btn-primary">${config.download}</a>
        </nav>

        <div class="mobile-menu-toggle">
            <ion-icon name="menu-outline"></ion-icon>
        </div>

        <div class="mobile-menu">
            <a href="${config.homeLink}#features">${config.features}</a>
            <a href="${config.homeLink}#about">${config.about}</a>
            <a href="${config.privacyLink}">${config.privacy}</a>
            
            ${mobileLangLinksHTML}

            <a href="${config.homeLink}#download" class="btn btn-primary">${config.download}</a>
            <div class="close-menu">
                <ion-icon name="close-outline"></ion-icon>
            </div>
        </div>
    </header>

    <div class="top-hero">
        <h1>${config.heroTitle}</h1>
        <p style="color: #aaa; max-width: 600px; margin: 0 auto;">${config.heroSubtitle}</p>
    </div>

    <div class="anime-grid">
        ${animeList.map(anime => generateAnimeCard(anime.slug, anime.title, anime.image, anime.score)).join('\n')}
    </div>

    <section class="social-section" style="padding: 40px 0; text-align: center;">
        <div class="footer-social">
            <h3>${config.followUs}</h3>
            <p>${config.followText}</p>
            <div class="social-icons">
                <a href="https://www.instagram.com/myanimedex/" target="_blank" aria-label="Follow us on Instagram">
                    <ion-icon name="logo-instagram"></ion-icon>
                </a>
            </div>
        </div>
    </section>

    <footer>
        <div class="footer-content">
            <div class="footer-brand">
                <div class="logo-container">
                    <img src="../header-logo.png" alt="MyAnimeDex Logo" class="footer-logo">
                    <span class="logo-text">MYANIME<span class="accent">DEX</span></span>
                </div>
                <p>${config.madeWith}</p>
            </div>

            <div class="footer-links">
                <a href="${config.homeLink}#features">${config.features}</a>
                <a href="${config.topAnimeLink}">Top 100 Anime</a>
                <a href="${config.privacyLink}">${config.privacy}</a>
                <a href="${config.deleteAccountLink}">${config.deleteAccount}</a>
                <a href="mailto:support@myanimedex.com">${config.contact}</a>
            </div>
        </div>
        <div class="copyright">
            &copy; 2025 ${config.allRights}
        </div>
    </footer>

    <script src="../script.js"></script>
</body>
</html>`;

        fs.writeFileSync(outputFilePath, pageContent);
        console.log(`Generated ${outputFilePath} (${langKey})`);
    }
}

main();
