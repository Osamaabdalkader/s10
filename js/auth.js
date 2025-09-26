// auth.js - كامل مع نظام الإحالة المحدث
class Auth {
    static async login(email, password) {
        try {
            console.log('🔐 محاولة تسجيل الدخول:', email);

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password.trim()
            });

            if (error) {
                console.error('❌ خطأ في تسجيل الدخول:', error);
                let errorMessage = 'فشل تسجيل الدخول';
                
                if (error.message.includes('Invalid login credentials')) {
                    errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
                } else if (error.message.includes('Email not confirmed')) {
                    errorMessage = 'يرجى تسجيل الدخول مباشرة (التفويض معطل للتطوير)';
                }
                
                throw new Error(errorMessage);
            }

            currentUser = data.user;
            this.onAuthStateChange();
            
            Utils.showStatus('تم تسجيل الدخول بنجاح!', 'success', 'login-status');
            
            setTimeout(() => {
                Navigation.showPage('home');
            }, 1000);

            console.log('✅ تم تسجيل الدخول بنجاح:', data.user.email);
            return true;
        } catch (error) {
            console.error('❌ خطأ في تسجيل الدخول:', error);
            throw error;
        }
    }

    static async register(userData) {
        try {
            console.log('👤 بدء عملية التسجيل:', {
                email: userData.email,
                name: userData.name,
                hasReferralCode: !!userData.referralCode
            });

            const { data, error } = await supabase.auth.signUp({
                email: userData.email.trim(),
                password: userData.password.trim(),
                options: {
                    data: {
                        full_name: userData.name.trim(),
                        phone: userData.phone.trim(),
                        address: userData.address.trim()
                    },
                    emailRedirectTo: window.location.origin
                }
            });

            if (error) {
                console.error('❌ خطأ في التسجيل:', error);
                let errorMessage = 'فشل في إنشاء الحساب';
                
                if (error.message.includes('User already registered')) {
                    errorMessage = 'هذا البريد الإلكتروني مسجل مسبقاً';
                } else if (error.message.includes('Password should be at least')) {
                    errorMessage = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
                } else if (error.message.includes('Invalid email')) {
                    errorMessage = 'البريد الإلكتروني غير صحيح';
                } else if (error.message.includes('Email rate limit exceeded')) {
                    errorMessage = 'تم تجاوز الحد المسموح من المحاولات، يرجى المحاولة لاحقاً';
                }
                
                throw new Error(errorMessage);
            }

            console.log('✅ تم إنشاء المستخدم في Auth:', data.user?.id);

            // معالجة الإحالة إذا وجدت (بعد نجاح التسجيل)
            if (userData.referralCode && data.user) {
                console.log('🔗 معالجة رمز الإحالة:', userData.referralCode);
                try {
                    const referralSuccess = await ReferralSystem.processReferral(
                        userData.referralCode, 
                        data.user.id
                    );
                    
                    if (referralSuccess) {
                        console.log('✅ تمت معالجة الإحالة بنجاح');
                        Utils.showStatus('تمت الإحالة بنجاح!', 'success', 'register-status');
                    } else {
                        console.log('⚠️ فشل في معالجة الإحالة (مستمر في التسجيل)');
                    }
                } catch (refError) {
                    console.error('❌ خطأ في معالجة الإحالة:', refError);
                    // نستمر في عملية التسجيل حتى لو فشلت الإحالة
                }
            }

            // إنشاء رمز إحالة للمستخدم الجديد
            if (data.user) {
                try {
                    await ReferralSystem.createReferralCode(data.user.id);
                    console.log('✅ تم إنشاء رمز إحالة للمستخدم الجديد');
                } catch (codeError) {
                    console.error('❌ خطأ في إنشاء رمز الإحالة:', codeError);
                    // نستمر حتى لو فشل إنشاء رمز الإحالة
                }
            }

            // إعادة تعيين النموذج
            const form = document.getElementById('register-form');
            if (form) form.reset();

            // عند تعطيل التحقق من البريد، المستخدم يكون مفعل مباشرة
            if (data.user) {
                currentUser = data.user;
                this.onAuthStateChange();
                
                Utils.showStatus('تم إنشاء الحساب بنجاح!', 'success', 'register-status');
                
                setTimeout(() => {
                    Navigation.showPage('home');
                }, 1500);
            } else {
                Utils.showStatus('تم إنشاء الحساب! يرجى تفعيل البريد الإلكتروني', 'success', 'register-status');
                
                setTimeout(() => {
                    Navigation.showPage('login');
                }, 2000);
            }

            console.log('🎉 اكتملت عملية التسجيل بنجاح');
            return true;

        } catch (error) {
            console.error('❌ خطأ في التسجيل:', error);
            
            // عرض رسالة الخطأ للمستخدم
            let errorMessage = error.message;
            if (!errorMessage || errorMessage === 'فشل في إنشاء الحساب') {
                errorMessage = 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى';
            }
            
            Utils.showStatus(errorMessage, 'error', 'register-status');
            throw error;
        }
    }

    static async logout() {
        try {
            console.log('🚪 محاولة تسجيل الخروج');
            
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            currentUser = null;
            this.onAuthStateChange();
            
            Utils.showStatus('تم تسجيل الخروج بنجاح', 'success', 'connection-status');
            Navigation.showPage('home');
            
            console.log('✅ تم تسجيل الخروج بنجاح');
        } catch (error) {
            console.error('❌ خطأ في تسجيل الخروج:', error.message);
            alert(`خطأ في تسجيل الخروج: ${error.message}`);
        }
    }

    static async checkAuth() {
        try {
            console.log('🔍 التحقق من حالة المصادقة');
            
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (session?.user) {
                currentUser = session.user;
                this.onAuthStateChange();
                console.log('✅ تم العثور على مستخدم مسجل:', currentUser.email);
            } else {
                console.log('⚠️ لا يوجد مستخدم مسجل');
            }
        } catch (error) {
            console.error('❌ خطأ في التحقق من المصادقة:', error.message);
        }
    }

    static onAuthStateChange() {
        console.log('🔄 تحديث حالة المصادقة:', currentUser ? 'مسجل الدخول' : 'غير مسجل');
        
        Navigation.updateNavigation();
        
        if (currentUser) {
            Utils.showStatus('تم تسجيل الدخول بنجاح', 'success', 'connection-status');
            
            // تحديث أي عناصر واجهة تحتاج إلى بيانات المستخدم
            this.updateUIForLoggedInUser();
        } else {
            // إخفاء العناصر الخاصة بالمستخدم المسجل
            this.updateUIForLoggedOutUser();
        }
    }

    static updateUIForLoggedInUser() {
        // تحديث أي عناصر في الواجهة تحتاج إلى بيانات المستخدم
        const userElements = document.querySelectorAll('[data-user-info]');
        userElements.forEach(element => {
            const infoType = element.getAttribute('data-user-info');
            switch (infoType) {
                case 'name':
                    element.textContent = currentUser.user_metadata?.full_name || 'مستخدم';
                    break;
                case 'email':
                    element.textContent = currentUser.email || '';
                    break;
            }
        });
    }

    static updateUIForLoggedOutUser() {
        // إعادة تعيين العناصر عند تسجيل الخروج
        const userElements = document.querySelectorAll('[data-user-info]');
        userElements.forEach(element => {
            element.textContent = '';
        });
    }

    static initAuthListener() {
        console.log('🔔 تهيئة مستمع حالة المصادقة');
        
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 تغيير في حالة المصادقة:', event, session?.user?.email);
            
            switch (event) {
                case 'SIGNED_IN':
                    if (session?.user) {
                        currentUser = session.user;
                        this.onAuthStateChange();
                        console.log('✅ تم تسجيل الدخول عبر المستمع');
                    }
                    break;
                    
                case 'SIGNED_OUT':
                    currentUser = null;
                    this.onAuthStateChange();
                    console.log('✅ تم تسجيل الخروج عبر المستمع');
                    break;
                    
                case 'USER_UPDATED':
                    if (session?.user) {
                        currentUser = session.user;
                        this.onAuthStateChange();
                        console.log('✅ تم تحديث بيانات المستخدم');
                    }
                    break;
                    
                case 'PASSWORD_RECOVERY':
                    console.log('🔐 عملية استعادة كلمة المرور');
                    break;
                    
                case 'TOKEN_REFRESHED':
                    console.log('🔄 تم تحديث Token');
                    break;
            }
        });
    }

    // دالة مساعدة للتحقق من صحة البريد الإلكتروني
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // دالة مساعدة للتحقق من قوة كلمة المرور
    static validatePassword(password) {
        if (password.length < 6) {
            return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        }
        return null;
    }

    // دالة لتحديث بيانات المستخدم
    static async updateProfile(profileData) {
        try {
            if (!currentUser) {
                throw new Error('يجب تسجيل الدخول لتحديث الملف الشخصي');
            }

            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: profileData.name,
                    phone: profileData.phone,
                    address: profileData.address
                }
            });

            if (error) throw error;

            Utils.showStatus('تم تحديث الملف الشخصي بنجاح', 'success');
            return true;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    // دالة لاستعادة كلمة المرور
    static async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });

            if (error) throw error;

            Utils.showStatus('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني', 'success');
            return true;
        } catch (error) {
            console.error('Error resetting password:', error);
            throw error;
        }
    }

    // دالة لتغيير كلمة المرور
    static async updatePassword(newPassword) {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            Utils.showStatus('تم تغيير كلمة المرور بنجاح', 'success');
            return true;
        } catch (error) {
            console.error('Error updating password:', error);
            throw error;
        }
    }
            }
