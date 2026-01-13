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
                email: 'support@myanimedex.com'
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
                email: 'support@myanimedex.com'
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
            faq: {
                title: 'よくある質問',
                q1: 'リストにアニメを追加するにはどうすればよいですか？',
                a1: 'アニメの詳細ページに移動し、ステータス（視聴中、完了、視聴予定など）を選択することで、リストにアニメを追加できます。',
                q2: 'アプリは無料ですか？',
                a2: 'はい、アプリの基本機能は無料です。追加機能のためのプレミアムサブスクリプションも提供しています。',
            },
            contact: {
                title: 'お問い合わせ',
                message: 'ご質問やサポートが必要な場合は、サポートチームまでお問い合わせください：',
                email: 'support@myanimedex.com'
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
            faq: {
                title: 'Часто задаваемые вопросы',
                q1: 'Как добавить аниме в мой список?',
                a1: 'Вы можете добавить аниме в свой список, перейдя на страницу сведений об аниме и выбрав статус (Смотрю, Завершено, Планирую и т. д.).',
                q2: 'Это приложение бесплатное?',
                a2: 'Да, основные функции приложения бесплатны. Мы также предлагаем премиум-подписку для дополнительных функций.',
            },
            contact: {
                title: 'Связаться с нами',
                message: 'Если у вас есть вопросы или вам нужна помощь, свяжитесь с нашей службой поддержки:',
                email: 'support@myanimedex.com'
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
            faq: {
                title: 'Häufig gestellte Fragen',
                q1: 'Wie füge ich Anime zu meiner Liste hinzu?',
                a1: 'Sie können Anime zu Ihrer Liste hinzufügen, indem Sie zur Anime-Detailseite navigieren und einen Status (Wird geschaut, Abgeschlossen, Geplant usw.) auswählen.',
                q2: 'Ist die App kostenlos?',
                a2: 'Ja, die Kernfunktionen der App sind kostenlos. Wir bieten auch ein Premium-Abonnement für zusätzliche Funktionen an.',
            },
            contact: {
                title: 'Kontaktieren Sie uns',
                message: 'Wenn Sie Fragen haben oder Hilfe benötigen, wenden Sie sich bitte an unser Support-Team:',
                email: 'support@myanimedex.com'
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
            faq: {
                title: 'الأسئلة الشائعة',
                q1: 'كيف أضيف أنمي إلى قائمتي؟',
                a1: 'يمكنك إضافة أنمي إلى قائمتك من خلال الانتقال إلى صفحة تفاصيل الأنمي واختيار الحالة (قيد المشاهدة، مكتمل، مخطط للمشاهدة، إلخ).',
                q2: 'هل التطبيق مجاني؟',
                a2: 'نعم، الميزات الأساسية للتطبيق مجانية. نقدم أيضًا اشتراكًا مميزًا للحصول على ميزات إضافية.',
            },
            contact: {
                title: 'اتصل بنا',
                message: 'إذا كان لديك أي أسئلة أو كنت بحاجة إلى مساعدة، يرجى الاتصال بفريق الدعم لدينا:',
                email: 'support@myanimedex.com'
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
        },
        offline: {
            title: 'Sin Conexión a Internet',
            message: 'Algunas funciones pueden no estar disponibles.',
        },
        terms: { title: 'Términos de Servicio' },
        privacy: { title: 'Política de Privacidad' },
        help: { title: 'Ayuda y Soporte' }
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
        },
        offline: {
            title: 'Sem Conexão com a Internet',
            message: 'Alguns recursos podem não estar disponíveis.',
        },
        terms: { title: 'Termos de Serviço' },
        privacy: { title: 'Política de Privacidade' },
        help: { title: 'Ajuda e Suporte' }
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
        },
        offline: {
            title: 'Tidak Ada Koneksi Internet',
            message: 'Beberapa fitur mungkin tidak tersedia.',
        },
        terms: { title: 'Ketentuan Layanan' },
        privacy: { title: 'Kebijakan Privasi' },
        help: { title: 'Bantuan & Dukungan' }
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
