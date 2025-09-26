// navigation.js - معدل (مع إضافة صفحة الشبكة وتحسينات الديبجينج)
class Navigation {
    static async showPage(pageId, params = {}) {
        console.log(`جاري تحميل الصفحة: ${pageId}`, params);
        
        // إظهار رسالة تحميل
        document.getElementById('dynamic-content').innerHTML = `
            <div class="loading-page">
                <div class="loading-spinner"></div>
                <p>جاري تحميل الصفحة...</p>
            </div>
        `;
        
        try {
            await Utils.loadPageContent(pageId);
            await this.initializePage(pageId, params);
            console.log(`تم تحميل الصفحة بنجاح: ${pageId}`);
        } catch (error) {
            console.error(`فشل في تحميل الصفحة: ${pageId}`, error);
            this.showErrorPage(error, pageId);
        }
    }

    static async initializePage(pageId, params = {}) {
        console.log(`جاري تهيئة الصفحة: ${pageId}`, params);
        
        // إعطاء وقت للعناصر لتصبح جاهزة في DOM
        await new Promise(resolve => setTimeout(resolve, 100));
        
        switch (pageId) {
            case 'publish':
                this.handlePublishPage();
                break;
            case 'login':
                this.handleLoginPage();
                break;
            case 'register':
                this.handleRegisterPage();
                break;
            case 'profile':
                this.handleProfilePage();
                break;
            case 'home':
                Posts.loadPosts();
                break;
            case 'post-details':
                this.handlePostDetailsPage(params);
                break;
            case 'network':
                this.handleNetworkPage();
                break;
        }
        
        // إعادة ربط الأحداث بعد تهيئة الصفحة
        this.rebindPageEvents(pageId);
    }

    // إعادة ربط الأحداث الخاصة بالصفحة
    static rebindPageEvents(pageId) {
        console.log(`إعادة ربط أحداث الصفحة: ${pageId}`);
        
        // هذه الوظيفة تتعامل مع أي أحداث خاصة تحتاج إلى ربط يدوي
        // الأحداث الرئيسية تتم معالجتها عبر النظام العالمي في App.js
    }

    static handlePublishPage() {
        const publishContent = document.getElementById('publish-content');
        const loginRequired = document.getElementById('login-required-publish');
        
        if (publishContent && loginRequired) {
            if (!currentUser) {
                publishContent.style.display = 'none';
                loginRequired.style.display = 'block';
            } else {
                publishContent.style.display = 'block';
                loginRequired.style.display = 'none';
            }
        }
    }

    static handleLoginPage() {
        // تنظيف رسائل الحالة عند تحميل الصفحة
        const statusEl = document.getElementById('login-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }

    static handleRegisterPage() {
        // تنظيف رسائل الحالة عند تحميل الصفحة
        const statusEl = document.getElementById('register-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }

    static handleProfilePage() {
        const profileContent = document.getElementById('profile-content');
        const loginRequired = document.getElementById('login-required-profile');
        
        if (profileContent && loginRequired) {
            if (!currentUser) {
                profileContent.style.display = 'none';
                loginRequired.style.display = 'block';
            } else {
                profileContent.style.display = 'block';
                loginRequired.style.display = 'none';
                this.loadProfileData();
            }
        }
    }

    static handlePostDetailsPage(params) {
        if (params.postId) {
            PostDetails.loadPostDetails(params.postId);
        } else {
            PostDetails.showError();
        }
    }

    // معالجة صفحة الشبكة
    static handleNetworkPage() {
        const networkContent = document.getElementById('network-content');
        const loginRequired = document.getElementById('login-required-network');
        
        if (networkContent && loginRequired) {
            if (!currentUser) {
                networkContent.style.display = 'none';
                loginRequired.style.display = 'block';
            } else {
                networkContent.style.display = 'block';
                loginRequired.style.display = 'none';
                this.loadNetworkData();
            }
        }
    }

    static loadProfileData() {
        if (currentUser) {
            const setName = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            
            setName('profile-name', currentUser.user_metadata.full_name || 'غير محدد');
            setName('profile-email', currentUser.email || 'غير محدد');
            setName('profile-phone', currentUser.user_metadata.phone || 'غير محدد');
            setName('profile-address', currentUser.user_metadata.address || 'غير محدد');
            setName('profile-created', new Date(currentUser.created_at).toLocaleString('ar-SA'));
        }
    }

    // تحميل بيانات الشبكة مع ديبجينج موسع
    static async loadNetworkData() {
        try {
            console.log('=== بدء تحميل بيانات الشبكة ===');

            // 1. تحميل أو إنشاء رمز الإحالة
            console.log('1. جاري تحميل رمز الإحالة...');
            let referralCode = await ReferralSystem.getUserReferralCode();
            
            if (!referralCode) {
                console.log('2. لا يوجد رمز إحالة، جاري إنشاء رمز جديد...');
                try {
                    referralCode = await ReferralSystem.createReferralCode();
                    console.log('3. تم إنشاء رمز إحالة جديد:', referralCode);
                } catch (error) {
                    console.error('4. فشل في إنشاء رمز الإحالة:', error);
                }
            } else {
                console.log('5. تم العثور على رمز إحالة موجود:', referralCode.code);
            }
            
            if (referralCode && referralCode.code) {
                document.getElementById('referral-code-display').textContent = referralCode.code;
                console.log('6. تم تعيين رمز الإحالة في الواجهة:', referralCode.code);
            } else {
                document.getElementById('referral-code-display').textContent = 'خطأ في التحميل';
                console.error('7. لم يتم إنشاء أو العثور على رمز إحالة');
            }

            // 2. تحميل إحصائيات الشبكة
            console.log('8. جاري تحميل إحصائيات الشبكة...');
            const stats = await ReferralSystem.getUserNetworkStats();
            console.log('9. الإحصائيات المستلمة:', stats);

            if (stats) {
                document.getElementById('direct-referrals-count').textContent = stats.direct_referrals_count || 0;
                document.getElementById('total-network-count').textContent = stats.total_network_count || 0;
                
                const activeLevels = [
                    stats.level_1_count, 
                    stats.level_2_count, 
                    stats.level_3_count, 
                    stats.level_4_count, 
                    stats.level_5_count
                ].filter(count => count > 0).length;
                
                document.getElementById('network-levels-count').textContent = activeLevels;
                console.log('10. تم تحديث الإحصائيات في الواجهة');
            } else {
                console.error('11. فشل في تحميل الإحصائيات');
                document.getElementById('direct-referrals-count').textContent = '0';
                document.getElementById('total-network-count').textContent = '0';
                document.getElementById('network-levels-count').textContent = '0';
            }

            // 3. تحميل الإحالات المباشرة
            console.log('12. جاري تحميل الإحالات المباشرة...');
            await this.loadDirectReferrals();

            // 4. تحميل الشجرة الكاملة
            console.log('13. جاري تحميل الشجرة الكاملة...');
            await this.loadNetworkTree();

            console.log('=== انتهى تحميل بيانات الشبكة بنجاح ===');

        } catch (error) {
            console.error('!!! خطأ في تحميل بيانات الشبكة:', error);
            Utils.showStatus('خطأ في تحميل بيانات الشبكة', 'error');
        }
    }

    // تحميل قائمة الإحالات المباشرة
    static async loadDirectReferrals() {
        try {
            const referrals = await ReferralSystem.getDirectReferrals();
            const container = document.getElementById('direct-referrals-list');
            
            if (!container) {
                console.error('عنصر direct-referrals-list غير موجود');
                return;
            }
            
            if (!referrals || referrals.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>لا توجد إحالات مباشرة بعد</h3>
                        <p>ابدأ بمشاركة رمز الإحالة الخاص بك لزيادة شبكتك</p>
                    </div>
                `;
                console.log('14. لا توجد إحالات مباشرة');
                return;
            }

            console.log('15. عدد الإحالات المباشرة:', referrals.length);

            let html = '';
            referrals.forEach((ref, index) => {
                const user = ref.referred_user;
                const name = user?.raw_user_meta_data?.full_name || 'مستخدم بدون اسم';
                const initial = name.charAt(0);
                const joinDate = new Date(ref.joined_at).toLocaleDateString('ar-SA');
                
                console.log(`16. الإحالة ${index + 1}:`, { name, email: user?.email, joinDate });
                
                html += `
                    <div class="referral-item">
                        <div class="referral-user-info">
                            <div class="referral-avatar">${initial}</div>
                            <div class="referral-details">
                                <h4>${name}</h4>
                                <p>${user?.email || 'بريد غير متوفر'}</p>
                            </div>
                        </div>
                        <div class="referral-date">${joinDate}</div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            console.log('17. تم تحميل قائمة الإحالات المباشرة');

        } catch (error) {
            console.error('18. خطأ في تحميل الإحالات المباشرة:', error);
            const container = document.getElementById('direct-referrals-list');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>خطأ في تحميل الإحالات</h3>
                        <p>حدث خطأ أثناء تحميل قائمة الإحالات</p>
                    </div>
                `;
            }
        }
    }

    // تحميل الشجرة الشبكية
    static async loadNetworkTree() {
        try {
            const network = await ReferralSystem.getFullNetwork();
            const container = document.getElementById('network-tree');
            
            if (!container) {
                console.error('عنصر network-tree غير موجود');
                return;
            }
            
            if (!network || network.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-sitemap"></i>
                        <h3>الشبكة فارغة حالياً</h3>
                        <p>سيظهر هيكل الشبكة هنا عند وجود إحالات</p>
                    </div>
                `;
                console.log('19. الشبكة فارغة');
                return;
            }

            console.log('20. عدد عناصر الشبكة:', network.length);

            // تجميع المستخدمين حسب العمق
            const levels = {};
            network.forEach(item => {
                if (!levels[item.depth]) {
                    levels[item.depth] = [];
                }
                levels[item.depth].push(item);
            });

            console.log('21. المستويات الموجودة:', Object.keys(levels));

            let html = '';
            Object.keys(levels).sort().forEach(depth => {
                const users = levels[depth];
                console.log(`22. المستوى ${depth}: ${users.length} مستخدم`);
                
                html += `
                    <div class="network-level">
                        <div class="level-header">
                            <strong>المستوى ${parseInt(depth) + 1}</strong> 
                            <span>(${users.length} عضو)</span>
                        </div>
                        <div class="level-users">
                `;
                
                users.forEach((user, userIndex) => {
                    const userData = user.network_user;
                    const name = userData?.raw_user_meta_data?.full_name || 'مستخدم بدون اسم';
                    const initial = name.charAt(0);
                    
                    html += `
                        <div class="user-node">
                            <div class="user-avatar">${initial}</div>
                            <div class="user-name">${name}</div>
                            <div class="user-email">${userData?.email || 'بريد غير متوفر'}</div>
                        </div>
                    `;
                });
                
                html += `</div></div>`;
            });
            
            container.innerHTML = html;
            console.log('23. تم تحميل الشجرة الشبكية بنجاح');

        } catch (error) {
            console.error('24. خطأ في تحميل الشجرة الشبكية:', error);
            const container = document.getElementById('network-tree');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>خطأ في تحميل الشبكة</h3>
                        <p>حدث خطأ أثناء تحميل هيكل الشبكة</p>
                    </div>
                `;
            }
        }
    }

    static updateNavigation() {
        // تحديث عناصر الهيدر
        const headerElements = {
            'publish-link': currentUser,
            'profile-link': currentUser,
            'network-link': currentUser,
            'logout-link': currentUser,
            'login-link': !currentUser,
            'register-link': !currentUser
        };

        for (const [id, shouldShow] of Object.entries(headerElements)) {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = shouldShow ? 'list-item' : 'none';
            }
        }

        // تحديث أيقونات الفوتر
        const footerProfile = document.getElementById('footer-profile-link');
        const footerPublish = document.getElementById('footer-publish-link');
        const footerNetwork = document.getElementById('footer-network-link');
        
        if (footerProfile) {
            footerProfile.style.display = currentUser ? 'flex' : 'none';
        }
        if (footerPublish) {
            footerPublish.style.display = currentUser ? 'flex' : 'none';
        }
        if (footerNetwork) {
            footerNetwork.style.display = currentUser ? 'flex' : 'none';
        }

        console.log('25. تم تحديث التنقل، المستخدم:', currentUser ? 'مسجل الدخول' : 'غير مسجل');
    }

    static showErrorPage(error, pageId) {
        document.getElementById('dynamic-content').innerHTML = `
            <div class="error-page">
                <h1 class="section-title">خطأ في تحميل الصفحة</h1>
                <p>تعذر تحميل الصفحة المطلوبة: ${pageId}</p>
                <p>الخطأ: ${error.message}</p>
                <button onclick="Navigation.showPage('home')">العودة إلى الرئيسية</button>
            </div>
        `;
    }
                               }
