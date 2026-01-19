import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

// Define translations
const translations = {
    en: {
        common: {
            loading: 'Loading...',
            error: 'Error',
            success: 'Success',
            save: 'Save',
            cancel: 'Cancel',
            back: 'Back',
            confirm: 'Confirm',
        },
        settings: {
            title: 'Settings',
            language: 'Language',
            theme: 'Dark Mode',
            support: 'Help & Support',
            privacy: 'Privacy Policy',
            terms: 'Terms of Service',
            logout: 'Log Out',
            appVersion: 'App Version',
            appearance: 'Appearance',
            account: 'Account',
            about: 'About',
        },
        profile: {
            myLibrary: 'My Library',
            myLists: 'My Lists',
            supportAndLegal: 'Support & Legal',
            dangerZone: 'Danger Zone',
            resetProgress: 'Reset Progress',
            deleteAccount: 'Delete Account',
        },
        calendar: {
            title: 'Broadcast Time',
            favoritesOnly: 'Favorites Only',
            days: {
                monday: 'Monday',
                tuesday: 'Tuesday',
                wednesday: 'Wednesday',
                thursday: 'Thursday',
                friday: 'Friday',
                saturday: 'Saturday',
                sunday: 'Sunday',
            },
            airingAt: 'Airing at',
            ep: 'EP',
            in: 'in',
        },
        home: {
            searchPlaceholder: 'Search anime...',
            trending: 'Trending Now',
            categories: 'Categories',
            cats: {
                all: 'All',
                action: 'Action',
                adventure: 'Adventure',
                comedy: 'Comedy',
                drama: 'Drama',
                fantasy: 'Fantasy',
                scifi: 'Sci-Fi',
                horror: 'Horror',
                romance: 'Romance',
                sliceOfLife: 'Slice of Life',
            }
        },
        favorites: {
            lists: 'Lists',
            searchPlaceholder: 'Search favorites...',
            filters: {
                all: 'All',
                watching: 'Watching',
                completed: 'Completed',
                planToWatch: 'Plan to Watch'
            }
        },
        animeDetail: {
            addToList: 'Add to List',
            saveToCustomList: 'Save to Custom List',
            episodesWatched: 'Episodes Watched',
            synopsis: 'Synopsis',
            rank: 'Rank',
            popularity: 'Popularity',
            members: 'Members',
            updateListStatus: 'Update List Status',
            removeFromList: 'Remove from List',
            noListsFound: 'No lists found.',
            createList: 'Create a List',
            alreadyInList: 'Anime is already in this list',
            addedToList: 'Added to list!',
            readMore: 'Read More',
            readLess: 'Read Less',
            reviews: 'Reviews',
            writeReview: 'Write a Review',
            editReview: 'Edit Your Review',
            rateAnime: 'Rate this Anime',
            reviewPlaceholder: 'Write your thoughts (optional)...',
            submitReview: 'Submit Review',
            noReviews: 'No reviews yet. Be the first to review!',
            reviewPublished: 'Review published! (+2 XP)',
            failedToPublish: 'Failed to publish review',
            ratingRequired: 'Rating Required',
            selectRating: 'Please select a star rating.',
            loginRequired: 'Login Required',
            loginToReview: 'Please log in to write a review.',
            createNewList: 'Create new list',
            enterListName: 'Enter list name',
            listDescription: 'Description (Optional)',
            publicList: 'Public List',
            publicListDesc: 'Anyone can see this list',
            create: 'Create'
        },
        offline: {
            title: 'No Internet Connection',
            message: 'Some features may be unavailable.',
        },
        terms: {
            title: 'Terms of Service',
            lastUpdated: 'Last Updated: December 22, 2025',
            intro: 'Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the MyAnimeDex application operated by us.',
            sections: {
                acceptance: {
                    title: '1. Acceptance of Terms',
                    content: 'By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.'
                },
                accounts: {
                    title: '2. Accounts',
                    content: 'When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms.'
                },
                content: {
                    title: '3. Content',
                    content: 'Our Service allows you to track, view, and share information about Anime. You are responsible for the content that you post to the Service, including its legality, reliability, and appropriateness.'
                },
                termination: {
                    title: '4. Termination',
                    content: 'We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.'
                }
            }
        },
        privacy: {
            title: 'Privacy Policy',
            lastUpdated: 'Last Updated: December 22, 2025',
            intro: 'This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service.',
            sections: {
                collection: {
                    title: '1. Collecting and Using Your Personal Data',
                    content: 'While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You.'
                },
                usage: {
                    title: '2. Use of Your Personal Data',
                    content: 'The Company may use Personal Data for the following purposes: to provide and maintain our Service, to manage Your Account, and to contact You.'
                },
                security: {
                    title: '3. Security of Your Personal Data',
                    content: 'The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure.'
                },
                deletion: {
                    title: '5. Account Deletion',
                    content: 'You have the right to request the deletion of your account and associated data. You can delete your account directly within the app via Profile > Danger Zone. This action is permanent.'
                }
            }
        },
        help: {
            title: 'Help & Support',
            walkthrough: {
                title: 'Walkthrough',
                subtitle: 'Learn about buttons, lists & more',
            },
            faq: {
                title: 'Frequently Asked Questions',
                q1: 'How do I add anime to my list?',
                a1: 'You can add anime to your list by navigating to the anime details page and selecting a status (Watching, Completed, Plan to Watch, etc.).',
                q2: 'Is the app free?',
                a2: 'Yes, the core features of the app are free to use. We also offer a premium subscription for additional features.',
                q3: 'How can I create a custom list?',
                a3: 'You can create a custom list by going to your Profile > Lists tab and tapping the "+" button. To add anime, go to any anime details page, tap "Add to List", and select your custom list.',
            },
            contact: {
                title: 'Contact Us',
                message: 'If you have any questions or need assistance, please contact our support team at:',
                email: 'support@myanimedex.com',
                emailButton: 'Email Support'
            },
            guide: {
                title: 'App Walkthrough',
                keys: {
                    title: 'Keys & Buttons Guide',
                    back: { label: 'Back', desc: 'Returns to the previous screen.' },
                    favorite: { label: 'Favorite', desc: 'Adds the anime to your Favorites list.' },
                    add: { label: 'Add to List', desc: 'Adds anime to Watching, Plan to Watch, or Completed.' },
                    custom: { label: 'Custom List', desc: 'Save anime to one of your custom lists.' },
                    remove: { label: 'Remove', desc: 'Removes an anime from your list.' },
                },
                sections: {
                    addFav: { title: 'How to Add to Favorites', content: 'On any Anime Details page, look for the Heart icon in the top right corner (or slightly below the header image). Tapping this icon will toggle the anime as a "Favorite". You can view all your favorites on your Profile page.' },
                    addList: { title: 'How to Add to List', content: 'On the Anime Details page, tap the large yellow "Add to List" button (or the button showing your current status). A menu will pop up allowing you to choose "Watching", "Completed", or "Plan to Watch". Selecting a status automatically tracks it in your library.' },
                    customList: { title: 'How to Create Custom Lists', content: 'You can organize anime into your own custom categories! You can create a list from your Profile > My Lists > "+" OR directly from the Anime Details page by tapping "Save to Custom List" > "Create new list". Give it a name and description, then save.' },
                    calendar: { title: 'How to Use Calendar', content: 'Check the Calendar tab to see daily broadcast schedules. You can filter by "Favorites Only" to see when your favorite shows are airing. Click on a day to view that day\'s lineup.' },
                    writeReview: { title: 'How to Write a Review', content: 'Scroll down on the Anime Details page to the "Reviews" section. Tap "Write a Review" to share your thoughts. You can rate the anime and earn XP!' },
                }
            }
        }
    },
    tr: {
        common: {
            loading: 'Yükleniyor...',
            error: 'Hata',
            success: 'Başarılı',
            save: 'Kaydet',
            cancel: 'İptal',
            back: 'Geri',
            confirm: 'Onayla',
        },
        settings: {
            title: 'Ayarlar',
            language: 'Dil',
            theme: 'Karanlık Mod',
            support: 'Yardım ve Destek',
            privacy: 'Gizlilik Politikası',
            terms: 'Kullanım Koşulları',
            logout: 'Çıkış Yap',
            appVersion: 'Uygulama Sürümü',
            appearance: 'Görünüm',
            account: 'Hesap',
            about: 'Hakkında',
        },
        profile: {
            myLibrary: 'Kütüphanem',
            myLists: 'Listelerim',
            supportAndLegal: 'Destek ve Yasal',
            dangerZone: 'Tehlike Bölgesi',
            resetProgress: 'İlerlemeyi Sıfırla',
            deleteAccount: 'Hesabı Sil',
        },
        calendar: {
            title: 'Yayın Saatleri',
            favoritesOnly: 'Sadece Favoriler',
            days: {
                monday: 'Pazartesi',
                tuesday: 'Salı',
                wednesday: 'Çarşamba',
                thursday: 'Perşembe',
                friday: 'Cuma',
                saturday: 'Cumartesi',
                sunday: 'Pazar',
            },
            airingAt: 'Yayınlanma',
            ep: 'Bölüm',
            in: 'kaldı',
        },
        home: {
            searchPlaceholder: 'Anime ara...',
            trending: 'Trend Olanlar',
            categories: 'Kategoriler',
            cats: {
                all: 'Tümü',
                action: 'Aksiyon',
                adventure: 'Macera',
                comedy: 'Komedi',
                drama: 'Dram',
                fantasy: 'Fantastik',
                scifi: 'Bilim Kurgu',
                horror: 'Korku',
                romance: 'Romantizm',
                sliceOfLife: 'Yaşamdan Kesitler',
            }
        },
        favorites: {
            lists: 'Listeler',
            searchPlaceholder: 'Favorilerde ara...',
            filters: {
                all: 'Tümü',
                watching: 'İzleniyor',
                completed: 'Tamamlandı',
                planToWatch: 'Planlanan'
            }
        },
        animeDetail: {
            addToList: 'Listeye Ekle',
            saveToCustomList: 'Özel Listeye Kaydet',
            episodesWatched: 'İzlenen Bölümler',
            synopsis: 'Özet',
            rank: 'Sıralama',
            popularity: 'Popülerlik',
            members: 'Üyeler',
            updateListStatus: 'Liste Durumunu Güncelle',
            removeFromList: 'Listeden Kaldır',
            noListsFound: 'Liste bulunamadı.',
            createList: 'Liste Oluştur',
            alreadyInList: 'Anime zaten bu listede',
            addedToList: 'Listeye eklendi!',
            readMore: 'Daha Fazla Oku',
            readLess: 'Daha Az Oku',
            reviews: 'Yorumlar',
            writeReview: 'Yorum Yaz',
            editReview: 'Yorumu Düzenle',
            rateAnime: 'Bu Animeyi Puanla',
            reviewPlaceholder: 'Düşüncelerini yaz (isteğe bağlı)...',
            submitReview: 'Yorumu Gönder',
            noReviews: 'Henüz yorum yok. İlk yorumu sen yap!',
            reviewPublished: 'Yorum yayınlandı! (+2 XP)',
            failedToPublish: 'Yorum yayınlanamadı',
            ratingRequired: 'Puan Gerekli',
            selectRating: 'Lütfen bir yıldız puanı seçin.',
            loginRequired: 'Giriş Gerekli',
            loginToReview: 'Yorum yazmak için lütfen giriş yapın.',
            createNewList: 'Yeni liste oluştur',
            enterListName: 'Liste adını girin',
            listDescription: 'Açıklama (İsteğe bağlı)',
            publicList: 'Herkese Açık Liste',
            publicListDesc: 'Bu listeyi herkes görebilir',
            create: 'Oluştur'
        },
        offline: {
            title: 'İnternet Bağlantısı Yok',
            message: 'Bazı özellikler kullanılamayabilir.',
        },
        terms: {
            title: 'Kullanım Koşulları',
            lastUpdated: 'Son Güncelleme: 22 Aralık 2025',
            intro: 'Bizim tarafımızdan işletilen MyAnimeDex uygulamasını kullanmadan önce lütfen bu Hizmet Koşullarını ("Koşullar", "Hizmet Koşulları") dikkatlice okuyun.',
            sections: {
                acceptance: {
                    title: '1. Koşulların Kabulü',
                    content: 'Hizmete erişerek veya Hizmeti kullanarak bu Koşullara tabi olmayı kabul edersiniz. Koşulların herhangi bir kısmını kabul etmiyorsanız Hizmete erişemezsiniz.'
                },
                accounts: {
                    title: '2. Hesaplar',
                    content: 'Bizde bir hesap oluşturduğunuzda, bize her zaman doğru, eksiksiz ve güncel bilgiler sağlamalısınız. Bunu yapmamak, Koşulların ihlali anlamına gelir.'
                },
                content: {
                    title: '3. İçerik',
                    content: 'Hizmetimiz Anime hakkında bilgi izlemenize, görüntülemenize ve paylaşmanıza olanak tanır. Hizmete gönderdiğiniz içeriğin yasallığı, güvenilirliği ve uygunluğu da dahil olmak üzere sorumluluğu size aittir.'
                },
                termination: {
                    title: '4. Fesih',
                    content: 'Koşulları ihlal etmeniz de dahil olmak üzere, herhangi bir nedenle, önceden bildirimde bulunmaksızın veya yükümlülük altına girmeksizin Hizmetimize erişimi derhal sonlandırabilir veya askıya alabiliriz.'
                }
            }
        },
        privacy: {
            title: 'Gizlilik Politikası',
            lastUpdated: 'Son Güncelleme: 22 Aralık 2025',
            intro: 'Bu Gizlilik Politikası, Hizmeti kullandığınızda bilgilerinizin toplanması, kullanılması ve ifşa edilmesine ilişkin politikalarımızı ve prosedürlerimizi açıklar.',
            sections: {
                collection: {
                    title: '1. Kişisel Verilerinizin Toplanması ve Kullanılması',
                    content: 'Hizmetimizi kullanırken, Sizinle iletişim kurmak veya Sizi tanımlamak için kullanılabilecek belirli kişisel olarak tanımlanabilir bilgileri Bize sağlamanızı isteyebiliriz.'
                },
                usage: {
                    title: '2. Kişisel Verilerinizin Kullanımı',
                    content: 'Şirket, Kişisel Verileri şu amaçlarla kullanabilir: Hizmetimizi sağlamak ve sürdürmek, Hesabınızı yönetmek ve Sizinle iletişim kurmak.'
                },
                security: {
                    title: '3. Kişisel Verilerinizin Güvenliği',
                    content: 'Kişisel Verilerinizin güvenliği Bizim için önemlidir, ancak İnternet üzerinden hiçbir iletim yönteminin veya elektronik depolama yönteminin %100 güvenli olmadığını unutmayın.'
                },
                deletion: {
                    title: '5. Hesap Silme',
                    content: 'Hesabınızın ve ilişkili verilerin silinmesini talep etme hakkına sahipsiniz. Hesabınızı Profil > Tehlike Bölgesi üzerinden doğrudan uygulama içinden silebilirsiniz. Bu işlem kalıcıdır.'
                }
            }
        },
        help: {
            title: 'Yardım ve Destek',
            walkthrough: {
                title: 'Uygulama Turu',
                subtitle: 'Düğmeler, listeler ve daha fazlası hakkında bilgi edinin',
            },
            faq: {
                title: 'Sıkça Sorulan Sorular',
                q1: 'Listeme nasıl anime eklerim?',
                a1: 'Anime detay sayfasına gidip bir durum (İzliyor, Tamamlandı, İzlenecek vb.) seçerek listenize anime ekleyebilirsiniz.',
                q2: 'Uygulama ücretsiz mi?',
                a2: 'Evet, uygulamanın temel özellikleri ücretsizdir. Ek özellikler için premium abonelik de sunuyoruz.',
                q3: 'Kendi listemi nasıl oluşturabilirim?',
                a3: 'Profil > Listeler sekmesine gidip "+" butonuna tıklayarak özel bir liste oluşturabilirsiniz. Anime eklemek için detay sayfasına gidin, "Listeye Ekle" butonuna tıklayın ve listenizi seçin.',
            },
            contact: {
                title: 'Bize Ulaşın',
                message: 'Herhangi bir sorunuz varsa veya yardıma ihtiyacınız varsa, lütfen destek ekibimizle iletişime geçin:',
                email: 'support@myanimedex.com',
                emailButton: 'E-posta Desteği'
            },
            guide: {
                title: 'Uygulama Turu',
                keys: {
                    title: 'Tuşlar ve Düğmeler Rehberi',
                    back: { label: 'Geri', desc: 'Önceki ekrana döner.' },
                    favorite: { label: 'Favori', desc: 'Animeyi favori listenize ekler.' },
                    add: { label: 'Listeye Ekle', desc: 'Animeyi İzliyor, İzlenecek veya Tamamlandı olarak ekler.' },
                    custom: { label: 'Özel Liste', desc: 'Animeyi özel listelerinizden birine kaydeder.' },
                    remove: { label: 'Kaldır', desc: 'Bir animeyi listenizden kaldırır.' },
                },
                sections: {
                    addFav: { title: 'Favorilere Nasıl Eklenir', content: 'Herhangi bir Anime Detay sayfasında, sağ üst köşedeki (veya başlık resminin hemen altındaki) Kalp simgesini bulun. Bu simgeye dokunmak animeyi "Favori" olarak işaretler. Tüm favorilerinizi Profil sayfanızda görebilirsiniz.' },
                    addList: { title: 'Listeye Nasıl Eklenir', content: 'Anime Detay sayfasında, büyük sarı "Listeye Ekle" düğmesine (veya mevcut durumunuzu gösteren düğmeye) dokunun. "İzliyor", "Tamamlandı" veya "İzlenecek" seçeneklerini seçmenize izin veren bir menü açılır. Bir durum seçmek onu otomatik olarak kütüphanenizde izler.' },
                    customList: { title: 'Özel Listeler Nasıl Oluşturulur', content: 'Animeleri kendi özel kategorilerinize ayırabilirsiniz! Profil > Listelerim > "+" yolunu izleyerek VEYA Anime Detay sayfasından "Özel Listeye Kaydet" > "Yeni liste oluştur"a dokunarak bir liste oluşturabilirsiniz. Listeye bir ad ve açıklama verin, ardından kaydedin.' },
                    calendar: { title: 'Takvim Nasıl Kullanılır', content: 'Günlük yayın programlarını görmek için Takvim sekmesini kontrol edin. Favori dizilerinizin ne zaman yayınlandığını görmek için "Sadece Favoriler"e göre filtreleyebilirsiniz. O günün programını görmek için bir güne tıklayın.' },
                    writeReview: { title: 'Yorum Nasıl Yazılır', content: 'Anime Detay sayfasında aşağı kaydırarak "Yorumlar" bölümüne gelin. Düşüncelerinizi paylaşmak için "Yorum Yaz"a dokunun. Animeyi puanlayabilir ve XP kazanabilirsiniz!' },
                }
            }
        }
    },
    ja: {
        common: {
            loading: '読み込み中...',
            error: 'エラー',
            success: '成功',
            save: '保存',
            cancel: 'キャンセル',
            back: '戻る',
            confirm: '確認',
        },
        settings: {
            title: '設定',
            language: '言語',
            theme: 'ダークモード',
            support: 'ヘルプとサポート',
            privacy: 'プライバシーポリシー',
            terms: '利用規約',
            logout: 'ログアウト',
            appVersion: 'アプリのバージョン',
            appearance: '外観',
            account: 'アカウント',
            about: '詳細',
        },
        profile: {
            myLibrary: 'マイライブラリ',
            myLists: 'マイリスト',
            supportAndLegal: 'サポート＆法的事項',
            dangerZone: '危険地帯',
            resetProgress: '進行状況をリセット',
            deleteAccount: 'アカウントを削除',
        },
        calendar: {
            title: '放送時間',
            favoritesOnly: 'お気に入りのみ',
            days: {
                monday: '月曜日',
                tuesday: '火曜日',
                wednesday: '水曜日',
                thursday: '木曜日',
                friday: '金曜日',
                saturday: '土曜日',
                sunday: '日曜日',
            },
            airingAt: '放送開始',
            ep: '話',
            in: 'あと',
        },
        home: {
            searchPlaceholder: 'アニメを検索...',
            trending: 'トレンド',
            categories: 'カテゴリー',
            cats: {
                all: 'すべて',
                action: 'アクション',
                adventure: '冒険',
                comedy: 'コメディ',
                drama: 'ドラマ',
                fantasy: 'ファンタジー',
                scifi: 'SF',
                horror: 'ホラー',
                romance: 'ロマンス',
                sliceOfLife: '日常',
            }
        },
        favorites: {
            lists: 'リスト',
            searchPlaceholder: 'お気に入りを検索...',
            filters: {
                all: 'すべて',
                watching: '視聴中',
                completed: '完了',
                planToWatch: '視聴予定'
            }
        },
        animeDetail: {
            addToList: 'リストに追加',
            saveToCustomList: 'カスタムリストに保存',
            episodesWatched: '視聴したエピソード',
            synopsis: 'あらすじ',
            rank: 'ランク',
            popularity: '人気',
            members: 'メンバー',
            updateListStatus: 'リストのステータスを更新',
            removeFromList: 'リストから削除',
            noListsFound: 'リストが見つかりません。',
            createList: 'リストを作成',
            alreadyInList: 'アニメは既にこのリストにあります',
            addedToList: 'リストに追加されました！',
            readMore: 'もっと読む',
            readLess: '閉じる',
            reviews: 'レビュー',
            writeReview: 'レビューを書く',
            editReview: 'レビューを編集',
            rateAnime: 'このアニメを評価',
            reviewPlaceholder: '感想を書く（任意）...',
            submitReview: 'レビューを送信',
            noReviews: 'まだレビューはありません。最初のレビューを書きましょう！',
            reviewPublished: 'レビューが公開されました！ (+2 XP)',
            failedToPublish: 'レビューの公開に失敗しました',
            ratingRequired: '評価が必要です',
            selectRating: '星の数を選択してください。',
            loginRequired: 'ログインが必要です',
            loginToReview: 'レビューを書くにはログインしてください。',
            createNewList: '新しいリストを作成',
            enterListName: 'リスト名を入力',
            listDescription: '説明（任意）',
            publicList: '公開リスト',
            publicListDesc: '誰でもこのリストを見ることができます',
            create: '作成'
        },
        offline: {
            title: 'インターネット接続がありません',
            message: '一部の機能が利用できない場合があります。',
        },
        terms: {
            title: '利用規約',
            lastUpdated: '最終更新日：2025年12月22日',
            intro: 'MyAnimeDexアプリケーションを使用する前に、これらの利用規約（「規約」、「利用規約」）を注意深くお読みください。',
            sections: {
                acceptance: {
                    title: '1. 規約の受諾',
                    content: 'サービスにアクセスまたは使用することにより、これらの規約に拘束されることに同意したことになります。規約の一部に同意しない場合は、サービスにアクセスできません。'
                },
                accounts: {
                    title: '2. アカウント',
                    content: 'アカウントを作成する際、正確で完全かつ最新の情報を提供する必要があります。これを怠ることは規約違反となります。'
                },
                content: {
                    title: '3. コンテンツ',
                    content: '当サービスでは、アニメに関する情報を追跡、表示、共有できます。サービスに投稿するコンテンツの合法性、信頼性、適切性については、お客様が責任を負います。'
                },
                termination: {
                    title: '4. 解約',
                    content: '規約違反を含むいかなる理由であっても、事前の通知や責任を負うことなく、直ちにサービスへのアクセスを終了または一時停止する場合があります。'
                }
            }
        },
        privacy: {
            title: 'プライバシーポリシー',
            lastUpdated: '最終更新日：2025年12月22日',
            intro: 'このプライバシーポリシーは、サービスを使用する際のお客様の情報の収集、使用、開示に関する当社の方針と手順を説明しています。',
            sections: {
                collection: {
                    title: '1. 個人データの収集と使用',
                    content: '当社のサービスを使用する際、連絡または特定に使用できる特定の個人情報の提供をお願いする場合があります。'
                },
                usage: {
                    title: '2. 個人データの使用',
                    content: '当社は、サービスの提供と維持、アカウントの管理、お客様への連絡のために個人データを使用する場合があります。'
                },
                security: {
                    title: '3. 個人データのセキュリティ',
                    content: '個人データのセキュリティは当社にとって重要ですが、インターネット上の送信方法や電子保存方法は100％安全ではないことを忘れないでください。'
                }
            }
        },
        help: {
            title: 'ヘルプとサポート',
            walkthrough: {
                title: 'ウォークスルー',
                subtitle: 'ボタン、リストなどの詳細',
            },
            faq: {
                title: 'よくある質問',
                q1: 'リストにアニメを追加するにはどうすればよいですか？',
                a1: 'アニメの詳細ページに移動し、ステータス（視聴中、完了、視聴予定など）を選択することで、リストにアニメを追加できます。',
                q2: 'アプリは無料ですか？',
                a2: 'はい、アプリの基本機能は無料です。追加機能のためのプレミアムサブスクリプションも提供しています。',
                q3: 'カスタムリストを作成するにはどうすればよいですか？',
                a3: 'プロフィール > リストタブに移動し、「+」ボタンをタップしてカスタムリストを作成できます。アニメを追加するには、アニメ詳細ページに移動し、「リストに追加」をタップしてカスタムリストを選択します。',
            },
            contact: {
                title: 'お問い合わせ',
                message: 'ご質問やサポートが必要な場合は、サポートチームまでお問い合わせください：',
                email: 'support@myanimedex.com',
                emailButton: 'メールサポート'
            },
            guide: {
                title: 'アプリウォークスルー',
                keys: {
                    title: 'キーとボタンのガイド',
                    back: { label: '戻る', desc: '前の画面に戻ります。' },
                    favorite: { label: 'お気に入り', desc: 'アニメをお気に入りリストに追加します。' },
                    add: { label: 'リストに追加', desc: 'アニメを視聴中、視聴予定、または完了に追加します。' },
                    custom: { label: 'カスタムリスト', desc: 'アニメをカスタムリストの1つに保存します。' },
                    remove: { label: '削除', desc: 'リストからアニメを削除します。' },
                },
                sections: {
                    addFav: { title: 'お気に入りへの追加方法', content: 'アニメ詳細ページの右上（またはヘッダー画像の下）にあるハートアイコンを探してください。このアイコンをタップすると、アニメがお気に入りとして切り替わります。お気に入りはプロフィールページですべて確認できます。' },
                    addList: { title: 'リストへの追加方法', content: 'アニメ詳細ページで、大きな黄色の「リストに追加」ボタン（または現在のステータスを表示しているボタン）をタップします。「視聴中」、「完了」、または「視聴予定」を選択できるメニューが表示されます。ステータスを選択すると、ライブラリで自動的に追跡されます。' },
                    customList: { title: 'カスタムリストの作成方法', content: 'アニメを独自のカスタムカテゴリに整理できます！ プロフィール > マイリスト > 「+」から、またはアニメ詳細ページで「カスタムリストに保存」>「新しいリストを作成」をタップしてリストを作成できます。名前と説明を入力して保存してください。' },
                    calendar: { title: 'カレンダーの使い方', content: 'カレンダータブで毎日の放送スケジュールを確認できます。「お気に入りのみ」でフィルタリングして、お気に入りの番組の放送時間を確認できます。日付をクリックするとその日のラインナップが表示されます。' },
                    writeReview: { title: 'レビューの書き方', content: 'アニメ詳細ページを下にスクロールして「レビュー」セクションに移動します。「レビューを書く」をタップして感想を共有しましょう。アニメを評価してXPを獲得できます！' },
                }
            }
        }
    },
    ru: {
        common: {
            loading: 'Загрузка...',
            error: 'Ошибка',
            success: 'Успешно',
            save: 'Сохранить',
            cancel: 'Отмена',
            back: 'Назад',
            confirm: 'Подтвердить',
        },
        settings: {
            title: 'Настройки',
            language: 'Язык',
            theme: 'Темная тема',
            support: 'Помощь и поддержка',
            privacy: 'Политика конфиденциальности',
            terms: 'Условия использования',
            logout: 'Выйти',
            appVersion: 'Версия приложения',
            appearance: 'Внешний вид',
            account: 'Аккаунт',
            about: 'О приложении',
        },
        profile: {
            myLibrary: 'Моя библиотека',
            myLists: 'Мои списки',
            supportAndLegal: 'Поддержка и Правовая информация',
            dangerZone: 'Опасная зона',
            resetProgress: 'Сбросить прогресс',
            deleteAccount: 'Удалить аккаунт',
        },
        calendar: {
            title: 'Время трансляции',
            favoritesOnly: 'Только избранное',
            days: {
                monday: 'Понедельник',
                tuesday: 'Вторник',
                wednesday: 'Среда',
                thursday: 'Четверг',
                friday: 'Пятница',
                saturday: 'Суббота',
                sunday: 'Воскресенье',
            },
            airingAt: 'В эфире в',
            ep: 'Эп.',
            in: 'через',
        },
        home: {
            searchPlaceholder: 'Поиск аниме...',
            trending: 'В тренде',
            categories: 'Категории',
            cats: {
                all: 'Все',
                action: 'Экшн',
                adventure: 'Приключения',
                comedy: 'Комедия',
                drama: 'Драма',
                fantasy: 'Фэнтези',
                scifi: 'Научная фантастика',
                horror: 'Ужасы',
                romance: 'Романтика',
                sliceOfLife: 'Повседневность',
            }
        },
        favorites: {
            lists: 'Списки',
            searchPlaceholder: 'Поиск в избранном...',
            filters: {
                all: 'Все',
                watching: 'Смотрю',
                completed: 'Завершено',
                planToWatch: 'В планах'
            }
        },
        animeDetail: {
            addToList: 'Добавить в список',
            saveToCustomList: 'Сохранить в свой список',
            episodesWatched: 'Просмотрено эпизодов',
            synopsis: 'Синопсис',
            rank: 'Ранг',
            popularity: 'Популярность',
            members: 'Участники',
            updateListStatus: 'Обновить статус списка',
            removeFromList: 'Удалить из списка',
            noListsFound: 'Списки не найдены.',
            createList: 'Создать список',
            alreadyInList: 'Аниме уже в этом списке',
            addedToList: 'Добавлено в список!',
            readMore: 'Читать больше',
            readLess: 'Свернуть',
            reviews: 'Отзывы',
            writeReview: 'Написать отзыв',
            editReview: 'Редактировать отзыв',
            rateAnime: 'Оценить аниме',
            reviewPlaceholder: 'Напишите свои мысли (необязательно)...',
            submitReview: 'Отправить отзыв',
            noReviews: 'Отзывов пока нет. Будьте первым!',
            reviewPublished: 'Отзыв опубликован! (+2 XP)',
            failedToPublish: 'Не удалось опубликовать отзыв',
            ratingRequired: 'Требуется рейтинг',
            selectRating: 'Пожалуйста, выберите рейтинг.',
            loginRequired: 'Требуется вход',
            loginToReview: 'Пожалуйста, войдите, чтобы написать отзыв.',
            createNewList: 'Создать новый список',
            enterListName: 'Введите название списка',
            listDescription: 'Описание (необязательно)',
            publicList: 'Публичный список',
            publicListDesc: 'Любой может видеть этот список',
            create: 'Создать'
        },
        offline: {
            title: 'Нет подключения к Интернету',
            message: 'Некоторые функции могут быть недоступны.',
        },
        terms: {
            title: 'Условия использования',
            lastUpdated: 'Последнее обновление: 22 декабря 2025 г.',
            intro: 'Пожалуйста, внимательно прочитайте эти Условия использования ("Условия") перед использованием приложения MyAnimeDex, управляемого нами.',
            sections: {
                acceptance: {
                    title: '1. Принятие условий',
                    content: 'Получая доступ к Сервису или используя его, вы соглашаетесь соблюдать эти Условия. Если вы не согласны с какой-либо частью условий, вы не можете получить доступ к Сервису.'
                },
                accounts: {
                    title: '2. Аккаунты',
                    content: 'При создании у нас учетной записи вы должны предоставить нам точную, полную и актуальную информацию. Невыполнение этого требования является нарушением Условий.'
                },
                content: {
                    title: '3. Контент',
                    content: 'Наш Сервис позволяет вам отслеживать, просматривать и делиться информацией об аниме. Вы несете ответственность за контент, который вы публикуете в Сервисе, включая его законность, надежность и уместность.'
                },
                termination: {
                    title: '4. Прекращение',
                    content: 'Мы можем прекратить или приостановить доступ к нашему Сервису немедленно, без предварительного уведомления или ответственности, по любой причине, включая, помимо прочего, нарушение вами Условий.'
                }
            }
        },
        privacy: {
            title: 'Политика конфиденциальности',
            lastUpdated: 'Последнее обновление: 22 декабря 2025 г.',
            intro: 'Эта Политика конфиденциальности описывает наши правила и процедуры сбора, использования и раскрытия вашей информации при использовании вами Сервиса.',
            sections: {
                collection: {
                    title: '1. Сбор и использование ваших личных данных',
                    content: 'При использовании нашего Сервиса мы можем попросить вас предоставить нам определенную личную информацию, которая может быть использована для связи с вами или вашей идентификации.'
                },
                usage: {
                    title: '2. Использование ваших личных данных',
                    content: 'Компания может использовать Персональные данные для следующих целей: предоставление и поддержка нашего Сервиса, управление вашей Учетной записью и связь с вами.'
                },
                security: {
                    title: '3. Безопасность ваших личных данных',
                    content: 'Безопасность ваших Персональных данных важна для нас, но помните, что ни один метод передачи через Интернет или метод электронного хранения не является безопасным на 100%.'
                }
            }
        },
        help: {
            title: 'Помощь и поддержка',
            walkthrough: {
                title: 'Руководство',
                subtitle: 'Узнайте о кнопках, списках и многом другом',
            },
            faq: {
                title: 'Часто задаваемые вопросы',
                q1: 'Как добавить аниме в мой список?',
                a1: 'Вы можете добавить аниме в свой список, перейдя на страницу сведений об аниме и выбрав статус (Смотрю, Завершено, Планирую и т. д.).',
                q2: 'Это приложение бесплатное?',
                a2: 'Да, основные функции приложения бесплатны. Мы также предлагаем премиум-подписку для дополнительных функций.',
                q3: 'Как создать свой список?',
                a3: 'Вы можете создать свой список, перейдя в Профиль > вкладка Списки и нажав кнопку «+». Чтобы добавить аниме, перейдите на любую страницу сведений об аниме, нажмите «Добавить в список» и выберите свой список.',
            },
            contact: {
                title: 'Связаться с нами',
                message: 'Если у вас есть вопросы или вам нужна помощь, свяжитесь с нашей службой поддержки:',
                email: 'support@myanimedex.com',
                emailButton: 'Написать в поддержку'
            },
            guide: {
                title: 'Руководство по приложению',
                keys: {
                    title: 'Руководство по кнопкам',
                    back: { label: 'Назад', desc: 'Возврат к предыдущему экрану.' },
                    favorite: { label: 'Избранное', desc: 'Добавляет аниме в ваш список избранного.' },
                    add: { label: 'Добавить в список', desc: 'Добавляет аниме в "Смотрю", "В планах" или "Завершено".' },
                    custom: { label: 'Свой список', desc: 'Сохранить аниме в один из ваших пользовательских списков.' },
                    remove: { label: 'Удалить', desc: 'Удаляет аниме из вашего списка.' },
                },
                sections: {
                    addFav: { title: 'Как добавить в избранное', content: 'На любой странице сведений об аниме найдите значок сердца в правом верхнем углу (или чуть ниже изображения заголовка). Нажатие на этот значок переключит аниме в разряд «Избранное». Вы можете просмотреть все избранные аниме на странице своего профиля.' },
                    addList: { title: 'Как добавить в список', content: 'На странице сведений об аниме нажмите большую желтую кнопку «Добавить в список» (или кнопку, отображающую ваш текущий статус). Всплывет меню, позволяющее выбрать «Смотрю», «Завершено» или «В планах». Выбор статуса автоматически отслеживает его в вашей библиотеке.' },
                    customList: { title: 'Как создать свои списки', content: 'Вы можете организовать аниме по своим собственным категориям! Вы можете создать список в Профиль > Мои списки > «+» ИЛИ прямо со страницы сведений об аниме, нажав «Сохранить в свой список» > «Создать новый список». Дайте ему имя и описание, затем сохраните.' },
                    calendar: { title: 'Как использовать календарь', content: 'Проверьте вкладку "Календарь", чтобы увидеть ежедневное расписание трансляций. Вы можете отфильтровать по "Только избранное", чтобы увидеть, когда выходят ваши любимые шоу. Нажмите на день, чтобы просмотреть расписание на этот день.' },
                    writeReview: { title: 'Как написать отзыв', content: 'Прокрутите страницу сведений об аниме вниз до раздела «Отзывы». Нажмите «Написать отзыв», чтобы поделиться своими мыслями. Вы можете оценить аниме и заработать XP!' },
                }
            }
        }
    },
    de: {
        common: {
            loading: 'Laden...',
            error: 'Fehler',
            success: 'Erfolg',
            save: 'Speichern',
            cancel: 'Abbrechen',
            back: 'Zurück',
            confirm: 'Bestätigen',
        },
        settings: {
            title: 'Einstellungen',
            language: 'Sprache',
            theme: 'Dunkelmodus',
            support: 'Hilfe & Support',
            privacy: 'Datenschutzrichtlinie',
            terms: 'Nutzungsbedingungen',
            logout: 'Abmelden',
            appVersion: 'App-Version',
            appearance: 'Erscheinungsbild',
            account: 'Konto',
            about: 'Über',
        },
        profile: {
            myLibrary: 'Meine Bibliothek',
            myLists: 'Meine Listen',
            supportAndLegal: 'Support & Rechtliches',
            dangerZone: 'Gefahrenzone',
            resetProgress: 'Fortschritt zurücksetzen',
            deleteAccount: 'Konto löschen',
        },
        calendar: {
            title: 'Sendezeit',
            favoritesOnly: 'Nur Favoriten',
            days: {
                monday: 'Montag',
                tuesday: 'Dienstag',
                wednesday: 'Mittwoch',
                thursday: 'Donnerstag',
                friday: 'Freitag',
                saturday: 'Samstag',
                sunday: 'Sonntag',
            },
            airingAt: 'Ausstrahlung um',
            ep: 'EP',
            in: 'in',
        },
        home: {
            searchPlaceholder: 'Anime suchen...',
            trending: 'Jetzt im Trend',
            categories: 'Kategorien',
            cats: {
                all: 'Alle',
                action: 'Action',
                adventure: 'Abenteuer',
                comedy: 'Komödie',
                drama: 'Drama',
                fantasy: 'Fantasie',
                scifi: 'Sci-Fi',
                horror: 'Horror',
                romance: 'Romantik',
                sliceOfLife: 'Alltagsleben',
            }
        },
        favorites: {
            lists: 'Listen',
            searchPlaceholder: 'Favoriten suchen...',
            filters: {
                all: 'Alle',
                watching: 'Am schauen',
                completed: 'Abgeschlossen',
                planToWatch: 'Geplant'
            }
        },
        animeDetail: {
            addToList: 'Zur Liste hinzufügen',
            saveToCustomList: 'In benutzerdefinierter Liste speichern',
            episodesWatched: 'Gesehene Episoden',
            synopsis: 'Zusammenfassung',
            rank: 'Rang',
            popularity: 'Popularität',
            members: 'Mitglieder',
            updateListStatus: 'Listenstatus aktualisieren',
            removeFromList: 'Aus Liste entfernen',
            noListsFound: 'Keine Listen gefunden.',
            createList: 'Liste erstellen',
            alreadyInList: 'Anime ist bereits in dieser Liste',
            addedToList: 'Zur Liste hinzugefügt!',
            readMore: 'Mehr lesen',
            readLess: 'Weniger lesen',
            reviews: 'Bewertungen',
            writeReview: 'Bewertung schreiben',
            editReview: 'Bewertung bearbeiten',
            rateAnime: 'Diesen Anime bewerten',
            reviewPlaceholder: 'Schreibe deine Gedanken (optional)...',
            submitReview: 'Bewertung absenden',
            noReviews: 'Noch keine Bewertungen. Sei der Erste!',
            reviewPublished: 'Bewertung veröffentlicht! (+2 XP)',
            failedToPublish: 'Bewertung konnte nicht veröffentlicht werden',
            ratingRequired: 'Bewertung erforderlich',
            selectRating: 'Bitte wähle eine Sternbewertung.',
            loginRequired: 'Anmeldung erforderlich',
            loginToReview: 'Bitte melde dich an, um eine Bewertung zu schreiben.',
            createNewList: 'Neue Liste erstellen',
            enterListName: 'Listennamen eingeben',
            listDescription: 'Beschreibung (Optional)',
            publicList: 'Öffentliche Liste',
            publicListDesc: 'Jeder kann diese Liste sehen',
            create: 'Erstellen'
        },
        offline: {
            title: 'Keine Internetverbindung',
            message: 'Einige Funktionen sind möglicherweise nicht verfügbar.',
        },
        terms: {
            title: 'Nutzungsbedingungen',
            lastUpdated: 'Letzte Aktualisierung: 22. Dezember 2025',
            intro: 'Bitte lesen Sie diese Nutzungsbedingungen ("Bedingungen", "Nutzungsbedingungen") sorgfältig durch, bevor Sie die von uns betriebene MyAnimeDex-Anwendung nutzen.',
            sections: {
                acceptance: {
                    title: '1. Annahme der Bedingungen',
                    content: 'Durch den Zugriff auf oder die Nutzung des Dienstes erklären Sie sich mit diesen Bedingungen einverstanden. Wenn Sie mit einem Teil der Bedingungen nicht einverstanden sind, dürfen Sie nicht auf den Dienst zugreifen.'
                },
                accounts: {
                    title: '2. Konten',
                    content: 'Wenn Sie ein Konto bei uns erstellen, müssen Sie uns Informationen zur Verfügung stellen, die jederzeit korrekt, vollständig und aktuell sind. Andernfalls liegt ein Verstoß gegen die Bedingungen vor.'
                },
                content: {
                    title: '3. Inhalt',
                    content: 'Unser Dienst ermöglicht es Ihnen, Informationen über Anime zu verfolgen, anzuzeigen und zu teilen. Sie sind für die Inhalte verantwortlich, die Sie im Dienst veröffentlichen, einschließlich deren Rechtmäßigkeit, Zuverlässigkeit und Angemessenheit.'
                },
                termination: {
                    title: '4. Kündigung',
                    content: 'Wir können den Zugang zu unserem Dienst sofort, ohne vorherige Ankündigung oder Haftung, aus beliebigem Grund kündigen oder aussetzen, einschließlich, aber nicht beschränkt auf den Fall, dass Sie gegen die Bedingungen verstoßen.'
                }
            }
        },
        privacy: {
            title: 'Datenschutzrichtlinie',
            lastUpdated: 'Letzte Aktualisierung: 22. Dezember 2025',
            intro: 'Diese Datenschutzrichtlinie beschreibt unsere Richtlinien und Verfahren zur Erhebung, Nutzung und Offenlegung Ihrer Informationen bei der Nutzung des Dienstes.',
            sections: {
                collection: {
                    title: '1. Erhebung und Nutzung Ihrer personenbezogenen Daten',
                    content: 'Während der Nutzung unseres Dienstes bitten wir Sie möglicherweise, uns bestimmte personenbezogene Daten zur Verfügung zu stellen, die verwendet werden können, um Sie zu kontaktieren oder zu identifizieren.'
                },
                usage: {
                    title: '2. Nutzung Ihrer personenbezogenen Daten',
                    content: 'Das Unternehmen kann personenbezogene Daten für folgende Zwecke verwenden: Bereitstellung und Aufrechterhaltung unseres Dienstes, Verwaltung Ihres Kontos und Kontaktaufnahme mit Ihnen.'
                },
                security: {
                    title: '3. Sicherheit Ihrer personenbezogenen Daten',
                    content: 'Die Sicherheit Ihrer personenbezogenen Daten ist uns wichtig, aber denken Sie daran, dass keine Übertragungsmethode über das Internet oder elektronische Speichermethode zu 100% sicher ist.'
                }
            }
        },
        help: {
            title: 'Hilfe & Support',
            walkthrough: {
                title: 'Rundgang',
                subtitle: 'Erfahren Sie mehr über Schaltflächen, Listen und mehr',
            },
            faq: {
                title: 'Häufig gestellte Fragen',
                q1: 'Wie füge ich Anime zu meiner Liste hinzu?',
                a1: 'Sie können Anime zu Ihrer Liste hinzufügen, indem Sie zur Anime-Detailseite navigieren und einen Status (Wird geschaut, Abgeschlossen, Geplant usw.) auswählen.',
                q2: 'Ist die App kostenlos?',
                a2: 'Ja, die Kernfunktionen der App sind kostenlos. Wir bieten auch ein Premium-Abonnement für zusätzliche Funktionen an.',
                q3: 'Wie kann ich eine benutzerdefinierte Liste erstellen?',
                a3: 'Sie können eine benutzerdefinierte Liste erstellen, indem Sie zu Ihrem Profil > Reiter Listen gehen und auf die Schaltfläche "+" tippen. Um Anime hinzuzufügen, gehen Sie zu einer Anime-Detailseite, tippen Sie auf "Zur Liste hinzufügen" und wählen Sie Ihre benutzerdefinierte Liste aus.',
            },
            contact: {
                title: 'Kontaktieren Sie uns',
                message: 'Wenn Sie Fragen haben oder Hilfe benötigen, wenden Sie sich bitte an unser Support-Team:',
                email: 'support@myanimedex.com',
                emailButton: 'E-Mail-Support'
            },
            guide: {
                title: 'App-Rundgang',
                keys: {
                    title: 'Tasten- & Schaltflächen-Guide',
                    back: { label: 'Zurück', desc: 'Kehrt zum vorherigen Bildschirm zurück.' },
                    favorite: { label: 'Favorit', desc: 'Fügt den Anime Ihrer Favoritenliste hinzu.' },
                    add: { label: 'Zur Liste hinzufügen', desc: 'Fügt Anime zu Am schauen, Geplant oder Abgeschlossen hinzu.' },
                    custom: { label: 'Benutzerdefinierte Liste', desc: 'Speichern Sie Anime in einer Ihrer benutzerdefinierten Listen.' },
                    remove: { label: 'Entfernen', desc: 'Entfernt einen Anime aus Ihrer Liste.' },
                },
                sections: {
                    addFav: { title: 'Wie man zu Favoriten hinzufügt', content: 'Suchen Sie auf jeder Anime-Detailseite nach dem Herzsymbol in der oberen rechten Ecke (oder etwas unterhalb des Titelbilds). Durch Tippen auf dieses Symbol wird der Anime als "Favorit" markiert. Sie können alle Ihre Favoriten auf Ihrer Profilseite anzeigen.' },
                    addList: { title: 'Wie man zur Liste hinzufügt', content: 'Tippen Sie auf der Anime-Detailseite auf die große gelbe Schaltfläche "Zur Liste hinzufügen" (oder die Schaltfläche, die Ihren aktuellen Status anzeigt). Ein Menü wird angezeigt, in dem Sie "Am schauen", "Abgeschlossen" oder "Geplant" auswählen können. Die Auswahl eines Status verfolgt ihn automatisch in Ihrer Bibliothek.' },
                    customList: { title: 'Wie man benutzerdefinierte Listen erstellt', content: 'Sie können Anime in Ihre eigenen benutzerdefinierten Kategorien organisieren! Sie können eine Liste über Profil > Meine Listen > "+" ODER direkt von der Anime-Detailseite erstellen, indem Sie auf "In benutzerdefinierter Liste speichern" > "Neue Liste erstellen" tippen. Geben Sie einen Namen und eine Beschreibung ein und speichern Sie.' },
                    calendar: { title: 'Verwendung des Kalenders', content: 'Überprüfen Sie den Reiter "Kalender", um die täglichen Sendepläne zu sehen. Sie können nach "Nur Favoriten" filtern, um zu sehen, wann Ihre Lieblingssendungen ausgestrahlt werden. Klicken Sie auf einen Tag, um das Programm für diesen Tag anzuzeigen.' },
                    writeReview: { title: 'Wie man eine Bewertung schreibt', content: 'Scrollen Sie auf der Anime-Detailseite nach unten zum Abschnitt "Bewertungen". Tippen Sie auf "Bewertung schreiben", um Ihre Gedanken zu teilen. Sie können den Anime bewerten und XP verdienen!' },
                }
            }
        }
    },
    ar: {
        common: {
            loading: 'جار التحميل...',
            error: 'خطأ',
            success: 'نجاح',
            save: 'حفظ',
            cancel: 'إلغاء',
            back: 'عودة',
            confirm: 'تأكيد',
        },
        settings: {
            title: 'الإعدادات',
            language: 'الغة',
            theme: 'الوضع الداكن',
            support: 'المساعدة والدعم',
            privacy: 'سياسة الخصوصية',
            terms: 'شروط الخدمة',
            logout: 'تسجيل الخروج',
            appVersion: 'إصدار التطبيق',
            appearance: 'المظهر',
            account: 'الحساب',
            about: 'عن التطبيق',
        },
        profile: {
            myLibrary: 'مكتبتي',
            myLists: 'قوائمي',
            supportAndLegal: 'الدعم والقانونية',
            dangerZone: 'منطقة الخطر',
            resetProgress: 'إعادة تعيين التقدم',
            deleteAccount: 'حذف الحساب',
        },
        calendar: {
            title: 'وقت البث',
            favoritesOnly: 'المفضلة فقط',
            days: {
                monday: 'الأثنين',
                tuesday: 'الثلاثاء',
                wednesday: 'الأربعاء',
                thursday: 'الخميس',
                friday: 'الجمعة',
                saturday: 'السبت',
                sunday: 'الأحد',
            },
            airingAt: 'يعرض في',
            ep: 'ح',
            in: 'خلال',
        },
        home: {
            searchPlaceholder: 'البحث عن أنمي...',
            trending: 'شائع الآن',
            categories: 'فئات',
            cats: {
                all: 'الكل',
                action: 'أكشن',
                adventure: 'مغامرة',
                comedy: 'كوميديا',
                drama: 'دراما',
                fantasy: 'خيال',
                scifi: 'خيال علمي',
                horror: 'رعب',
                romance: 'رومانسية',
                sliceOfLife: 'شريحة من الحياة',
            }
        },
        favorites: {
            lists: 'القوائم',
            searchPlaceholder: 'البحث في المفضلة...',
            filters: {
                all: 'الكل',
                watching: 'أشاهد',
                completed: 'مكتمل',
                planToWatch: 'أخطط لمشاهدته'
            }
        },
        animeDetail: {
            addToList: 'إضافة إلى القائمة',
            saveToCustomList: 'حفظ في قائمة مخصصة',
            episodesWatched: 'الحلقات التي تمت مشاهدتها',
            synopsis: 'ملخص',
            rank: 'تصنيف',
            popularity: 'شعبية',
            members: 'أعضاء',
            updateListStatus: 'تحديث حالة القائمة',
            removeFromList: 'إزالة من القائمة',
            noListsFound: 'لا توجد قوائم.',
            createList: 'إنشاء قائمة',
            alreadyInList: 'الأنمي موجود بالفعل في هذه القائمة',
            addedToList: 'تمت الإضافة إلى القائمة!',
            failedToAdd: 'فشل في الإضافة إلى القائمة',
            createNewList: 'إنشاء قائمة جديدة',
            enterListName: 'أدخل اسم القائمة',
            listDescription: 'الوصف (اختياري)',
            publicList: 'قائمة عامة',
            publicListDesc: 'يمكن لأي شخص رؤية هذه القائمة',
            create: 'إنشاء',
            readMore: 'اقرأ المزيد',
            readLess: 'اقرأ أقل',
            reviews: 'المراجعات',
            writeReview: 'اكتب مراجعة',
            editReview: 'تعديل مراجعتك',
            rateAnime: 'قيم هذا الأنمي',
            reviewPlaceholder: 'أكتب أفكارك (اختياري)...',
            submitReview: 'إرسال المراجعة',
            noReviews: 'لا توجد مراجعات بعد. كن أول من يراجع!',
            reviewPublished: 'تم نشر المراجعة! (+2 XP)',
            failedToPublish: 'فشل نشر المراجعة',
            ratingRequired: 'التقييم مطلوب',
            selectRating: 'يرجى تحديد تصنيف النجوم.',
            loginRequired: 'تسجيل الدخول مطلوب',
            loginToReview: 'يرجى تسجيل الدخول لكتابة مراجعة.'
        },
        offline: {
            title: 'لا يوجد اتصال بالإنترنت',
            message: 'قد تكون بعض الميزات غير متوفرة.',
        },
        terms: {
            title: 'شروط الخدمة',
            lastUpdated: 'آخر تحديث: 22 ديسمبر 2025',
            intro: 'يرجى قراءة شروط الخدمة هذه ("الشروط") بعناية قبل استخدام تطبيق MyAnimeDex الذي نقوم بتشغيله.',
            sections: {
                acceptance: {
                    title: '1. قبول الشروط',
                    content: 'من خلال الوصول إلى الخدمة أو استخدامها، فإنك توافق على الالتزام بهذه الشروط. إذا كنت لا توافق على أي جزء من الشروط، فلا يجوز لك الوصول إلى الخدمة.'
                },
                accounts: {
                    title: '2. الحسابات',
                    content: 'عند إنشاء حساب معنا، يجب عليك تزويدنا بمعلومات دقيقة وكاملة وحديثة في جميع الأوقات. يشكل الفشل في القيام بذلك خرقًا للشروط.'
                },
                content: {
                    title: '3. المحتوى',
                    content: 'تتيح لك خدمتنا تتبع وعرض ومشاركة المعلومات حول الأنمي. أنت مسؤول عن المحتوى الذي تنشره على الخدمة، بما في ذلك شرعيته وموثوقيته وملاءمته.'
                },
                termination: {
                    title: '4. الإنهاء',
                    content: 'يجوز لنا إنهاء أو تعليق الوصول إلى خدمتنا فورًا، دون إشعار مسبق أو مسؤولية، لأي سبب كان، بما في ذلك على سبيل المثال لا الحصر إذا انتهكت الشروط.'
                }
            }
        },
        privacy: {
            title: 'سياسة الخصوصية',
            lastUpdated: 'آخر تحديث: 22 ديسمبر 2025',
            intro: 'تصف سياسة الخصوصية هذه سياساتنا وإجراءاتنا المتعلقة بجمع واستخدام والإفصاح عن معلوماتك عند استخدام الخدمة.',
            sections: {
                collection: {
                    title: '1. جمع واستخدام بياناتك الشخصية',
                    content: 'أثناء استخدام خدمتنا، قد نطلب منك تزويدنا ببعض المعلومات الشخصية التي يمكن استخدامها للاتصال بك أو تحديد هويتك.'
                },
                usage: {
                    title: '2. استخدام بياناتك الشخصية',
                    content: 'قد تستخدم الشركة البيانات الشخصية للأغراض التالية: توفير وصيانة خدمتنا، وإدارة حسابك، والاتصال بك.'
                },
                security: {
                    title: '3. أمن بياناتك الشخصية',
                    content: 'أمن بياناتك الشخصية مهم بالنسبة لنا، ولكن تذكر أنه لا توجد طريقة نقل عبر الإنترنت أو طريقة تخزين إلكتروني آمنة بنسبة 100%.'
                }
            }
        },
        help: {
            title: 'المساعدة والدعم',
            walkthrough: {
                title: 'جولة تعريفية',
                subtitle: 'تعرف على الأزرار والقوائم والمزيد',
            },
            faq: {
                title: 'الأسئلة الشائعة',
                q1: 'كيف أضيف أنمي إلى قائمتي؟',
                a1: 'يمكنك إضافة أنمي إلى قائمتك من خلال الانتقال إلى صفحة تفاصيل الأنمي واختيار الحالة (قيد المشاهدة، مكتمل، مخطط للمشاهدة، إلخ).',
                q2: 'هل التطبيق مجاني؟',
                a2: 'نعم، الميزات الأساسية للتطبيق مجانية. نقدم أيضًا اشتراكًا مميزًا للحصول على ميزات إضافية.',
                q3: 'كيف يمكنني إنشاء قائمة مخصصة؟',
                a3: 'يمكنك إنشاء قائمة مخصصة بالانتقال إلى ملفك الشخصي > علامة تبويب القوائم والنقر على زر "+". لإضافة أنمي، انتقل إلى أي صفحة تفاصيل أنمي، واضغط على "إضافة إلى القائمة"، واختر قائمتك المخصصة.',
            },
            contact: {
                title: 'اتصل بنا',
                message: 'إذا كان لديك أي أسئلة أو كنت بحاجة إلى مساعدة، يرجى الاتصال بفريق الدعم لدينا:',
                email: 'support@myanimedex.com',
                emailButton: 'دعم البريد الإلكتروني'
            },
            guide: {
                title: 'جولة في التطبيق',
                keys: {
                    title: 'دليل المفاتيح والأزرار',
                    back: { label: 'عودة', desc: 'يعود إلى الشاشة السابقة.' },
                    favorite: { label: 'مفضل', desc: 'يضيف الأنمي إلى قائمة المفضلة لديك.' },
                    add: { label: 'إضافة إلى القائمة', desc: 'يضيف الأنمي إلى "أشاهد"، "مخطط للمشاهدة"، أو "مكتمل".' },
                    custom: { label: 'قائمة مخصصة', desc: 'حفظ الأنمي في إحدى قوائمك المخصصة.' },
                    remove: { label: 'إزالة', desc: 'يزيل الأنمي من قائمتك.' },
                },
                sections: {
                    addFav: { title: 'كيفية الإضافة إلى المفضلة', content: 'في أي صفحة تفاصيل أنمي، ابحث عن رمز القلب في الزاوية العلوية اليمنى (أو أسفل صورة العنوان قليلاً). سيؤدي النقر فوق هذا الرمز إلى تبديل الأنمي كـ "مفضل". يمكنك عرض جميع مفضلاتك على صفحة ملفك الشخصي.' },
                    addList: { title: 'كيفية الإضافة إلى القائمة', content: 'في صفحة تفاصيل الأنمي، اضغط على الزر الأصفر الكبير "إضافة إلى القائمة" (أو الزر الذي يظهر حالتك الحالية). ستظهر قائمة تتيح لك اختيار "أشاهد" أو "مكتمل" أو "مخطط للمشاهدة". يؤدي تحديد الحالة إلى تتبعها تلقائيًا في مكتبتك.' },
                    customList: { title: 'كيفية إنشاء قوائم مخصصة', content: 'يمكنك تنظيم الأنمي في فئاتك الخاصة! يمكنك إنشاء قائمة من الملف الشخصي > قوائمي > "+" أو مباشرة من صفحة تفاصيل الأنمي بالنقر على "حفظ في قائمة مخصصة" > "إنشاء قائمة جديدة". أدخل اسمًا ووصفًا، ثم احفظ.' },
                    calendar: { title: 'كيفية استخدام التقويم', content: 'تحقق من علامة تبويب "التقويم" لرؤية جداول البث اليومية. يمكنك التصفية حسب "المفضلة فقط" لمعرفة متى يتم عرض برامجك المفضلة. انقر على أي يوم لعرض تشكيلة ذلك اليوم.' },
                    writeReview: { title: 'كيفية كتابة مراجعة', content: 'قم بالتمرير لأسفل في صفحة تفاصيل الأنمي إلى قسم "المراجعات". اضغط على "اكتب مراجعة" لمشاركة أفكارك. يمكنك تقييم الأنمي وكسب نقاط خبرة!' },
                }
            }
        }
    },
    es: {
        common: {
            loading: 'Cargando...',
            error: 'Error',
            success: 'Éxito',
            save: 'Guardar',
            cancel: 'Cancelar',
            back: 'Atrás',
            confirm: 'Confirmar',
        },
        settings: {
            title: 'Configuración',
            language: 'Idioma',
            theme: 'Modo Oscuro',
            support: 'Ayuda y Soporte',
            privacy: 'Política de Privacidad',
            terms: 'Términos de Servicio',
            logout: 'Cerrar Sesión',
            appVersion: 'Versión de la Aplicación',
            appearance: 'Apariencia',
            account: 'Cuenta',
            about: 'Acerca de',
        },
        profile: {
            myLibrary: 'Mi Biblioteca',
            myLists: 'Mis Listas',
            supportAndLegal: 'Soporte y Legal',
            dangerZone: 'Zona de Peligro',
            resetProgress: 'Restablecer Progreso',
            deleteAccount: 'Eliminar Cuenta',
        },
        calendar: {
            title: 'Hora de emisión',
            favoritesOnly: 'Solo favoritos',
            days: {
                monday: 'Lunes',
                tuesday: 'Martes',
                wednesday: 'Miércoles',
                thursday: 'Jueves',
                friday: 'Viernes',
                saturday: 'Sábado',
                sunday: 'Domingo',
            },
            airingAt: 'Emisión a las',
            ep: 'EP',
            in: 'en',
        },
        home: {
            searchPlaceholder: 'Buscar anime...',
            trending: 'En Tendencia',
            categories: 'Categorías',
            cats: {
                all: 'Todo',
                action: 'Acción',
                adventure: 'Aventura',
                comedy: 'Comedia',
                drama: 'Drama',
                fantasy: 'Fantasía',
                scifi: 'Ciencia Ficción',
                horror: 'Terror',
                romance: 'Romance',
                sliceOfLife: 'Recuentos de la vida',
            }
        },
        favorites: {
            lists: 'Listas',
            searchPlaceholder: 'Buscar favoritos...',
            filters: {
                all: 'Todo',
                watching: 'Viendo',
                completed: 'Completado',
                planToWatch: 'Planeado'
            }
        },
        animeDetail: {
            addToList: 'Añadir a Lista',
            saveToCustomList: 'Guardar en Lista Personalizada',
            episodesWatched: 'Episodios Vistos',
            synopsis: 'Sinopsis',
            rank: 'Rango',
            popularity: 'Popularidad',
            members: 'Miembros',
            updateListStatus: 'Actualizar Estado de Lista',
            removeFromList: 'Eliminar de Lista',
            noListsFound: 'No se encontraron listas.',
            createList: 'Crear una Lista',
            alreadyInList: 'El anime ya está en esta lista',
            addedToList: '¡Añadido a la lista!',
            failedToAdd: 'Error al añadir a la lista',
            createNewList: 'Crear nueva lista',
            enterListName: 'Introducir nombre de lista',
            listDescription: 'Descripción (Opcional)',
            publicList: 'Lista Pública',
            publicListDesc: 'Cualquiera puede ver esta lista',
            create: 'Crear',
            readMore: 'Leer más',
            readLess: 'Leer menos',
            reviews: 'Reseñas',
            writeReview: 'Escribir reseña',
            editReview: 'Editar tu reseña',
            rateAnime: 'Calificar este anime',
            reviewPlaceholder: 'Escribe tus pensamientos (opcional)...',
            submitReview: 'Enviar reseña',
            noReviews: 'Aún no hay reseñas. ¡Sé el primero en opinar!',
            reviewPublished: '¡Reseña publicada! (+2 XP)',
            failedToPublish: 'Error al publicar reseña',
            ratingRequired: 'Calificación requerida',
            selectRating: 'Por favor selecciona una calificación.',
            loginRequired: 'Inicio de sesión requerido',
            loginToReview: 'Por favor inicia sesión para escribir una reseña.'
        },
        offline: {
            title: 'Sin Conexión a Internet',
            message: 'Algunas funciones pueden no estar disponibles.',
        },
        terms: { title: 'Términos de Servicio' },
        privacy: { title: 'Política de Privacidad' },
        help: {
            title: 'Ayuda y Soporte',
            walkthrough: {
                title: 'Guía',
                subtitle: 'Aprende sobre botones, listas y más',
            },
            faq: {
                title: 'Preguntas Frecuentes',
                q1: '¿Cómo añado anime a mi lista?',
                a1: 'Puedes añadir anime a tu lista navegando a la página de detalles del anime y seleccionando un estado (Viendo, Completado, Planeado, etc.).',
                q2: '¿Es la aplicación gratuita?',
                a2: 'Sí, las funciones principales de la aplicación son gratuitas. También ofrecemos una suscripción premium para funciones adicionales.',
                q3: '¿Cómo puedo crear una lista personalizada?',
                a3: 'Puedes crear una lista personalizada yendo a tu Perfil > pestaña Listas y tocando el botón "+". Para añadir anime, ve a cualquier página de detalles de anime, toca "Añadir a Lista" y selecciona tu lista personalizada.',
            },
            contact: {
                title: 'Contáctanos',
                message: 'Si tienes alguna pregunta o necesitas ayuda, por favor contacta a nuestro equipo de soporte en:',
                email: 'support@myanimedex.com',
                emailButton: 'Soporte por Correo'
            },
            guide: {
                title: 'Guía de la Aplicación',
                keys: {
                    title: 'Guía de Teclas y Botones',
                    back: { label: 'Atrás', desc: 'Regresa a la pantalla anterior.' },
                    favorite: { label: 'Favorito', desc: 'Añade el anime a tu lista de Favoritos.' },
                    add: { label: 'Añadir a Lista', desc: 'Añade anime a Viendo, Planeado o Completado.' },
                    custom: { label: 'Lista Personalizada', desc: 'Guarda anime en una de tus listas personalizadas.' },
                    remove: { label: 'Eliminar', desc: 'Elimina un anime de tu lista.' },
                },
                sections: {
                    addFav: { title: 'Cómo añadir a Favoritos', content: 'En cualquier página de detalles de anime, busca el icono de Corazón en la esquina superior derecha. Tocar este icono marcará el anime como "Favorito".' },
                    addList: { title: 'Cómo añadir a Lista', content: 'En la página de detalles del anime, toca el botón amarillo grande "Añadir a Lista". Aparecerá un menú que te permitirá elegir "Viendo", "Completado" o "Planeado".' },
                    customList: { title: 'Cómo crear listas personalizadas', content: '¡Puedes organizar el anime en tus propias categorías personalizadas!! Puedes crear una lista desde Perfil > Mis Listas > "+" O directamente desde la página de Detalles del Anime tocando "Guardar en Lista Personalizada" > "Crear nueva lista". Dale un nombre y una descripción, luego guarda.' },
                    calendar: { title: 'Cómo usar el Calendario', content: 'Revisa la pestaña "Calendario" para ver los horarios de emisión diarios. Puedes filtrar por "Solo favoritos" para ver cuándo se emiten tus programas favoritos. Haz clic en un día para ver la programación de ese día.' },
                    writeReview: { title: 'Cómo escribir una reseña', content: 'Desplázate hacia abajo en la página de Detalles del Anime hasta la sección "Reseñas". Toca "Escribir reseña" para compartir tus pensamientos. ¡Puedes calificar el anime y ganar XP!' },
                }
            }
        }
    },
    pt: {
        common: {
            loading: 'Carregando...',
            error: 'Erro',
            success: 'Sucesso',
            save: 'Salvar',
            cancel: 'Cancelar',
            back: 'Voltar',
            confirm: 'Confirmar',
        },
        settings: {
            title: 'Configurações',
            language: 'Idioma',
            theme: 'Modo Escuro',
            support: 'Ajuda e Suporte',
            privacy: 'Política de Privacidade',
            terms: 'Termos de Serviço',
            logout: 'Sair',
            appVersion: 'Versão do Aplicativo',
            appearance: 'Aparência',
            account: 'Conta',
            about: 'Sobre',
        },
        profile: {
            myLibrary: 'Minha Biblioteca',
            myLists: 'Minhas Listas',
            supportAndLegal: 'Suporte e Legal',
            dangerZone: 'Zona de Perigo',
            resetProgress: 'Redefinir Progresso',
            deleteAccount: 'Excluir Conta',
        },
        calendar: {
            title: 'Horário de Transmissão',
            favoritesOnly: 'Apenas Favoritos',
            days: {
                monday: 'Segunda',
                tuesday: 'Terça',
                wednesday: 'Quarta',
                thursday: 'Quinta',
                friday: 'Sexta',
                saturday: 'Sábado',
                sunday: 'Domingo',
            },
            airingAt: 'No ar às',
            ep: 'EP',
            in: 'em',
        },
        home: {
            searchPlaceholder: 'Buscar anime...',
            trending: 'Em Alta',
            categories: 'Categorias',
            cats: {
                all: 'Todos',
                action: 'Ação',
                adventure: 'Aventura',
                comedy: 'Comédia',
                drama: 'Drama',
                fantasy: 'Fantasia',
                scifi: 'Ficção Científica',
                horror: 'Terror',
                romance: 'Romance',
                sliceOfLife: 'Cotidiano',
            }
        },
        favorites: {
            lists: 'Listas',
            searchPlaceholder: 'Buscar favoritos...',
            filters: {
                all: 'Todos',
                watching: 'Assistindo',
                completed: 'Completo',
                planToWatch: 'Planejado'
            }
        },
        animeDetail: {
            addToList: 'Adicionar à Lista',
            saveToCustomList: 'Salvar na Lista Personalizada',
            episodesWatched: 'Episódios Assistidos',
            synopsis: 'Sinopse',
            rank: 'Classificação',
            popularity: 'Popularidade',
            members: 'Membros',
            updateListStatus: 'Atualizar Status da Lista',
            removeFromList: 'Remover da Lista',
            noListsFound: 'Nenhuma lista encontrada.',
            createList: 'Criar uma Lista',
            alreadyInList: 'Anime já está nesta lista',
            addedToList: 'Adicionado à lista!',
            failedToAdd: 'Falha ao adicionar à lista',
            createNewList: 'Criar nova lista',
            enterListName: 'Digite o nome da lista',
            listDescription: 'Descrição (Opcional)',
            publicList: 'Lista Pública',
            publicListDesc: 'Qualquer pessoa pode ver esta lista',
            create: 'Criar',
            readMore: 'Ler mais',
            readLess: 'Ler menos',
            reviews: 'Avaliações',
            writeReview: 'Escrever avaliação',
            editReview: 'Editar sua avaliação',
            rateAnime: 'Avaliar este anime',
            reviewPlaceholder: 'Escreva seus pensamentos (opcional)...',
            submitReview: 'Enviar avaliação',
            noReviews: 'Ainda sem avaliações. Seja o primeiro a avaliar!',
            reviewPublished: 'Avaliação publicada! (+2 XP)',
            failedToPublish: 'Falha ao publicar avaliação',
            ratingRequired: 'Avaliação necessária',
            selectRating: 'Por favor selecione uma classificação.',
            loginRequired: 'Login necessário',
            loginToReview: 'Por favor faça login para escrever uma avaliação.'
        },
        offline: {
            title: 'Sem Conexão com a Internet',
            message: 'Alguns recursos podem não estar disponíveis.',
        },
        terms: { title: 'Termos de Serviço' },
        privacy: { title: 'Política de Privacidade' },
        help: {
            title: 'Ajuda e Suporte',
            walkthrough: {
                title: 'Visão Geral',
                subtitle: 'Saiba mais sobre botões, listas e mais',
            },
            faq: {
                title: 'Perguntas Frequentes',
                q1: 'Como adiciono anime à minha lista?',
                a1: 'Você pode adicionar anime à sua lista navegando até a página de detalhes do anime e selecionando um status (Assistindo, Completo, Planejado, etc.).',
                q2: 'O aplicativo é gratuito?',
                a2: 'Sim, os recursos principais do aplicativo são gratuitos. Também oferecemos uma assinatura premium para recursos adicionais.',
                q3: 'Como posso criar uma lista personalizada?',
                a3: 'Você pode criar uma lista personalizada indo em seu Perfil > aba Listas e tocando no botão "+". Para adicionar anime, vá para qualquer página de detalhes de anime, toque em "Adicionar à Lista" e selecione sua lista personalizada.',
            },
            contact: {
                title: 'Fale Conosco',
                message: 'Se você tiver alguma dúvida ou precisar de ajuda, entre em contato com nossa equipe de suporte em:',
                email: 'support@myanimedex.com',
                emailButton: 'Suporte por E-mail'
            },
            guide: {
                title: 'Tour do Aplicativo',
                keys: {
                    title: 'Guia de Teclas e Botões',
                    back: { label: 'Voltar', desc: 'Retorna à tela anterior.' },
                    favorite: { label: 'Favorito', desc: 'Adiciona o anime à sua lista de Favoritos.' },
                    add: { label: 'Adicionar à Lista', desc: 'Adiciona anime a Assistindo, Planejado ou Completo.' },
                    custom: { label: 'Lista Personalizada', desc: 'Salva anime em uma de suas listas personalizadas.' },
                    remove: { label: 'Remover', desc: 'Remove um anime da sua lista.' },
                },
                sections: {
                    addFav: { title: 'Como adicionar aos Favoritos', content: 'Em qualquer página de detalhes de anime, procure o ícone de Coração no canto superior direito. Tocar neste ícone marcará o anime como "Favorito".' },
                    addList: { title: 'Como adicionar à Lista', content: 'Na página de detalhes do anime, toque no grande botão amarelo "Adicionar à Lista". Um menu aparecerá permitindo que você escolha "Assistindo", "Completo" ou "Planejado".' },
                    customList: { title: 'Como criar listas personalizadas', content: 'Você pode organizar animes em suas próprias categorias personalizadas! Você pode criar uma lista em Perfil > Minhas Listas > "+" OU diretamente da página de Detalhes do Anime tocando em "Salvar na Lista Personalizada" > "Criar nova lista". Dê um nome e descrição, e salve.' },
                    calendar: { title: 'Como usar o Calendário', content: 'Verifique a aba "Calendário" para ver a programação diária de transmissão. Você pode filtrar por "Apenas Favoritos" para ver quando seus programas favoritos estão no ar. Clique em um dia para ver a programação desse dia.' },
                    writeReview: { title: 'Como escrever uma avaliação', content: 'Role para baixo na página de Detalhes do Anime até a seção "Avaliações". Toque em "Escrever avaliação" para compartilhar seus pensamentos. Você pode avaliar o anime e ganhar XP!' },
                }
            }
        }
    },
    id: {
        common: {
            loading: 'Memuat...',
            error: 'Kesalahan',
            success: 'Berhasil',
            save: 'Simpan',
            cancel: 'Batal',
            back: 'Kembali',
            confirm: 'Konfirmasi',
        },
        settings: {
            title: 'Pengaturan',
            language: 'Bahasa',
            theme: 'Mode Gelap',
            support: 'Bantuan & Dukungan',
            privacy: 'Kebijakan Privasi',
            terms: 'Ketentuan Layanan',
            logout: 'Keluar',
            appVersion: 'Versi Aplikasi',
            appearance: 'Tampilan',
            account: 'Akun',
            about: 'Tentang',
        },
        profile: {
            myLibrary: 'Perpustakaan Saya',
            myLists: 'Daftar Saya',
            supportAndLegal: 'Dukungan & Legal',
            dangerZone: 'Zona Bahaya',
            resetProgress: 'Atur Ulang Progres',
            deleteAccount: 'Hapus Akun',
        },
        calendar: {
            title: 'Waktu Tayang',
            favoritesOnly: 'Hanya Favorit',
            days: {
                monday: 'Senin',
                tuesday: 'Selasa',
                wednesday: 'Rabu',
                thursday: 'Kamis',
                friday: 'Jumat',
                saturday: 'Sabtu',
                sunday: 'Minggu',
            },
            airingAt: 'Tayang pada',
            ep: 'EP',
            in: 'dalam',
        },
        home: {
            searchPlaceholder: 'Cari anime...',
            trending: 'Sedang Tren',
            categories: 'Kategori',
            cats: {
                all: 'Semua',
                action: 'Aksi',
                adventure: 'Petualangan',
                comedy: 'Komedi',
                drama: 'Drama',
                fantasy: 'Fantasi',
                scifi: 'Fiksi Ilmiah',
                horror: 'Horor',
                romance: 'Romantis',
                sliceOfLife: 'Sepenggal Kehidupan',
            }
        },
        favorites: {
            lists: 'Daftar',
            searchPlaceholder: 'Cari favorit...',
            filters: {
                all: 'Semua',
                watching: 'Sedang Menonton',
                completed: 'Selesai',
                planToWatch: 'Rencana Menonton'
            }
        },
        animeDetail: {
            addToList: 'Tambahkan ke Daftar',
            saveToCustomList: 'Simpan ke Daftar Khusus',
            episodesWatched: 'Episode Ditonton',
            synopsis: 'Sinopsis',
            rank: 'Peringkat',
            popularity: 'Popularitas',
            members: 'Anggota',
            updateListStatus: 'Perbarui Status Daftar',
            removeFromList: 'Hapus dari Daftar',
            noListsFound: 'Daftar tidak ditemukan.',
            createList: 'Buat Daftar',
            alreadyInList: 'Anime sudah ada di daftar ini',
            addedToList: 'Ditambahkan ke daftar!',
            failedToAdd: 'Gagal menambahkan ke daftar',
            createNewList: 'Buat daftar baru',
            enterListName: 'Masukkan nama daftar',
            listDescription: 'Deskripsi (Opsional)',
            publicList: 'Daftar Publik',
            publicListDesc: 'Siapa saja dapat melihat daftar ini',
            create: 'Buat',
            readMore: 'Baca selengkapnya',
            readLess: 'Lebih sedikit',
            reviews: 'Ulasan',
            writeReview: 'Tulis Ulasan',
            editReview: 'Edit Ulasan Anda',
            rateAnime: 'Nilai Anime ini',
            reviewPlaceholder: 'Tulis pendapat Anda (opsional)...',
            submitReview: 'Kirim Ulasan',
            noReviews: 'Belum ada ulasan. Jadilah yang pertama mengulas!',
            reviewPublished: 'Ulasan diterbitkan! (+2 XP)',
            failedToPublish: 'Gagal menerbitkan ulasan',
            ratingRequired: 'Peringkat Diperlukan',
            selectRating: 'Silakan pilih peringkat bintang.',
            loginRequired: 'Login Diperlukan',
            loginToReview: 'Silakan login untuk menulis ulasan.'
        },
        offline: {
            title: 'Tidak Ada Koneksi Internet',
            message: 'Beberapa fitur mungkin tidak tersedia.',
        },
        terms: { title: 'Ketentuan Layanan' },
        privacy: { title: 'Kebijakan Privasi' },
        help: {
            title: 'Bantuan & Dukungan',
            walkthrough: {
                title: 'Panduan',
                subtitle: 'Pelajari tentang tombol, daftar & lainnya',
            },
            faq: {
                title: 'Pertanyaan Umum',
                q1: 'Bagaimana cara menambahkan anime ke daftar saya?',
                a1: 'Anda dapat menambahkan anime ke daftar Anda dengan menavigasi ke halaman detail anime dan memilih status (Sedang Menonton, Selesai, Rencana Menonton, dll.).',
                q2: 'Apakah aplikasi ini gratis?',
                a2: 'Ya, fitur utama aplikasi ini gratis untuk digunakan. Kami juga menawarkan langganan premium untuk fitur tambahan.',
                q3: 'Bagaimana cara membuat daftar khusus?',
                a3: 'Anda dapat membuat daftar khusus dengan membuka Profil > tab Daftar dan mengetuk tombol "+". Untuk menambahkan anime, buka halaman detail anime mana pun, ketuk "Tambahkan ke Daftar", dan pilih daftar khusus Anda.',
            },
            contact: {
                title: 'Hubungi Kami',
                message: 'Jika Anda memiliki pertanyaan atau butuh bantuan, silakan hubungi tim dukungan kami di:',
                email: 'support@myanimedex.com',
                emailButton: 'Dukungan Email'
            },
            guide: {
                title: 'Panduan Aplikasi',
                keys: {
                    title: 'Panduan Tombol & Kunci',
                    back: { label: 'Kembali', desc: 'Kembali ke layar sebelumnya.' },
                    favorite: { label: 'Favorit', desc: 'Menambahkan anime ke daftar Favorit Anda.' },
                    add: { label: 'Tambahkan ke Daftar', desc: 'Menambahkan anime ke Sedang Menonton, Rencana Menonton, atau Selesai.' },
                    custom: { label: 'Daftar Khusus', desc: 'Simpan anime ke salah satu daftar khusus Anda.' },
                    remove: { label: 'Hapus', desc: 'Menghapus anime dari daftar Anda.' },
                },
                sections: {
                    addFav: { title: 'Cara Menambahkan ke Favorit', content: 'Di halaman Detail Anime, cari ikon Hati di sudut kanan atas. Mengetuk ikon ini akan menandai anime sebagai "Favorit".' },
                    addList: { title: 'Cara Menambahkan ke Daftar', content: 'Di halaman Detail Anime, ketuk tombol kuning besar "Tambahkan ke Daftar". Menu akan muncul yang memungkinkan Anda memilih "Sedang Menonton", "Selesai", atau "Rencana Menonton".' },
                    customList: { title: 'Cara Membuat Daftar Khusus', content: 'Anda dapat mengatur anime ke dalam kategori khusus Anda sendiri! Anda dapat membuat daftar dari Profil > Daftar Saya > "+" ATAU langsung dari halaman Detail Anime dengan mengetuk "Simpan ke Daftar Khusus" > "Buat daftar baru". Beri nama dan deskripsi, lalu simpan.' },
                    calendar: { title: 'Cara Menggunakan Kalender', content: 'Periksa tab "Kalender" untuk melihat jadwal tayang harian. Anda dapat memfilter berdasarkan "Hanya Favorit" untuk melihat kapan acara favorit Anda tayang. Klik pada hari untuk melihat jadwal hari itu.' },
                    writeReview: { title: 'Cara Menulis Ulasan', content: 'Gulir ke bawah pada halaman Detail Anime ke bagian "Ulasan". Ketuk "Tulis Ulasan" untuk membagikan pendapat Anda. Anda dapat memberi peringkat anime dan mendapatkan XP!' },
                }
            }
        }
    },
};

const i18n = new I18n(translations);

// Set default locale to 'en' regardless of system locale, unless manually set by user later (handled in context)
// The user requested: "otomatik ingilizce gelecek app" (App should come in English automatically)
i18n.locale = 'en';

// When a value is missing from a language it'll fall back to another language with the key present.
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export default i18n;
