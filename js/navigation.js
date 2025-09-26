// js/referral.js - نظام إحالة جديد ومحسّن
class ReferralSystem {
    // إنشاء رمز إحالة جديد
    static async createReferralCode(userId) {
        try {
            const code = this.generateReferralCode(8);
            console.log('🎯 محاولة إنشاء رمز إحالة:', code, 'للمستخدم:', userId);

            const { data, error } = await supabase
                .from('referral_codes')
                .insert([{ 
                    user_id: userId, 
                    code: code 
                }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // unique violation
                    console.log('⚠️ المستخدم لديه رمز إحالة بالفعل، جاري جلب الرمز الموجود');
                    return await this.getUserReferralCode(userId);
                }
                throw error;
            }

            console.log('✅ تم إنشاء رمز إحالة بنجاح:', data);
            return data;
        } catch (error) {
            console.error('❌ خطأ في إنشاء رمز الإحالة:', error);
            throw error;
        }
    }

    // الحصول على رمز إحالة المستخدم
    static async getUserReferralCode(userId = null) {
        try {
            const targetUserId = userId || currentUser?.id;
            if (!targetUserId) {
                console.log('⚠️ لا يوجد مستخدم مسجل');
                return null;
            }

            const { data, error } = await supabase
                .from('referral_codes')
                .select('*')
                .eq('user_id', targetUserId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // no rows
                    console.log('⚠️ لا يوجد رمز إحالة، جاري إنشاء رمز جديد');
                    return await this.createReferralCode(targetUserId);
                }
                throw error;
            }

            console.log('✅ تم العثور على رمز إحالة:', data.code);
            return data;
        } catch (error) {
            console.error('❌ خطأ في جلب رمز الإحالة:', error);
            throw error;
        }
    }

    // معالجة الإحالة عند التسجيل
    static async processReferral(referralCode, newUserId) {
        try {
            console.log('🎯 بدء معالجة الإحالة:', {
                referralCode: referralCode,
                newUserId: newUserId
            });

            if (!referralCode || !newUserId) {
                console.log('⚠️ بيانات الإحالة ناقصة');
                return false;
            }

            // البحث عن صاحب رمز الإحالة
            const { data: codeOwner, error: codeError } = await supabase
                .from('referral_codes')
                .select('user_id, code')
                .eq('code', referralCode.toUpperCase().trim())
                .single();

            if (codeError || !codeOwner) {
                console.log('❌ رمز الإحالة غير صحيح:', referralCode);
                return false;
            }

            const referrerId = codeOwner.user_id;
            console.log('✅ تم العثور على صاحب الرمز:', referrerId);

            // منع الإحالة الذاتية
            if (referrerId === newUserId) {
                console.log('⚠️ لا يمكن الإحالة إلى النفس');
                return false;
            }

            // إنشاء سجل الإحالة
            const { error: referralError } = await supabase
                .from('referrals')
                .insert([{
                    referrer_id: referrerId,
                    referred_id: newUserId,
                    referral_code_used: referralCode.toUpperCase().trim()
                }]);

            if (referralError) {
                if (referralError.code === '23505') { // already referred
                    console.log('⚠️ المستخدم لديه إحالة بالفعل');
                    return true;
                }
                throw referralError;
            }

            console.log('✅ تم إنشاء سجل الإحالة بنجاح');

            // تحديث الشبكة الهرمية
            await this.updateNetworkHierarchy(newUserId, referrerId);
            
            // تحديث الإحصائيات
            await this.updateNetworkStats(referrerId);

            console.log('🎉 تمت معالجة الإحالة بنجاح');
            return true;

        } catch (error) {
            console.error('❌ خطأ في معالجة الإحالة:', error);
            return false;
        }
    }

    // تحديث الهيكل الهرمي للشبكة
    static async updateNetworkHierarchy(newUserId, referrerId) {
        try {
            console.log('🌳 تحديث الهيكل الهرمي:', { newUserId, referrerId });

            // الحصول على عمق المُحيل
            const { data: referrerData, error: referrerError } = await supabase
                .from('network_tree')
                .select('depth')
                .eq('user_id', referrerId)
                .single();

            if (referrerError) {
                console.error('❌ خطأ في جلب بيانات المُحيل:', referrerError);
                return;
            }

            const newDepth = (referrerData?.depth || 0) + 1;
            console.log('📊 عمق المستخدم الجديد:', newDepth);

            // تحديث عمق المستخدم الجديد
            const { error: updateError } = await supabase
                .from('network_tree')
                .update({ 
                    referrer_id: referrerId,
                    depth: newDepth
                })
                .eq('user_id', newUserId);

            if (updateError) throw updateError;

            console.log('✅ تم تحديث الهيكل الهرمي بنجاح');

        } catch (error) {
            console.error('❌ خطأ في تحديث الهيكل الهرمي:', error);
        }
    }

    // تحديث إحصائيات الشبكة (طريقة جديدة ومحسنة)
    static async updateNetworkStats(userId) {
        try {
            console.log('📈 تحديث إحصائيات الشبكة للمستخدم:', userId);

            // 1. حساب الإحالات المباشرة
            const { count: directCount, error: directError } = await supabase
                .from('referrals')
                .select('*', { count: 'exact', head: true })
                .eq('referrer_id', userId);

            if (directError) throw directError;

            // 2. حساب الشبكة الكاملة (جميع المستويات)
            const { data: networkData, error: networkError } = await supabase
                .from('network_tree')
                .select('depth')
                .eq('referrer_id', userId)
                .lte('depth', 5); // لحد المستوى الخامس فقط

            if (networkError) throw networkError;

            // 3. تجميع الإحصائيات حسب المستوى
            const levelStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            
            if (networkData && networkData.length > 0) {
                networkData.forEach(item => {
                    const level = item.depth;
                    if (level >= 1 && level <= 5) {
                        levelStats[level] = (levelStats[level] || 0) + 1;
                    }
                });
            }

            // 4. الحساب النهائي
            const totalNetwork = Object.values(levelStats).reduce((sum, count) => sum + count, 0);

            console.log('📊 الإحصائيات المحسوبة:', {
                direct: directCount,
                total: totalNetwork,
                levels: levelStats
            });

            // 5. التحديث في قاعدة البيانات
            const { error: updateError } = await supabase
                .from('user_network_stats')
                .update({
                    direct_referrals: directCount || 0,
                    total_network: totalNetwork,
                    level_1_count: levelStats[1] || 0,
                    level_2_count: levelStats[2] || 0,
                    level_3_count: levelStats[3] || 0,
                    level_4_count: levelStats[4] || 0,
                    level_5_count: levelStats[5] || 0,
                    last_updated: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (updateError) throw updateError;

            console.log('✅ تم تحديث الإحصائيات بنجاح');

            // 6. تحديث إحصائيات الأسلاف إن أمكن
            await this.updateAncestorsStats(userId);

        } catch (error) {
            console.error('❌ خطأ في تحديث الإحصائيات:', error);
        }
    }

    // تحديث إحصائيات الأسلاف في الشبكة
    static async updateAncestorsStats(userId) {
        try {
            console.log('🔄 تحديث إحصائيات الأسلاف للمستخدم:', userId);

            // إيجاد المُحيل المباشر
            const { data: userData, error: userError } = await supabase
                .from('network_tree')
                .select('referrer_id')
                .eq('user_id', userId)
                .single();

            if (userError || !userData || !userData.referrer_id) {
                console.log('⚠️ لا يوجد أسلاف لتحديث إحصائياتهم');
                return;
            }

            let currentReferrerId = userData.referrer_id;
            let levelsUpdated = 0;

            // تحديث إحصائيات الأسلاف حتى المستوى الخامس
            while (currentReferrerId && levelsUpdated < 5) {
                await this.updateNetworkStats(currentReferrerId);
                levelsUpdated++;

                // الانتقال إلى المُحيل التالي في السلسلة
                const { data: nextReferrer } = await supabase
                    .from('network_tree')
                    .select('referrer_id')
                    .eq('user_id', currentReferrerId)
                    .single();

                currentReferrerId = nextReferrer?.referrer_id;
            }

            console.log(`✅ تم تحديث ${levelsUpdated} مستوى من الأسلاف`);

        } catch (error) {
            console.error('❌ خطأ في تحديث إحصائيات الأسلاف:', error);
        }
    }

    // الحصول على إحصائيات الشبكة
    static async getUserNetworkStats(userId = null) {
        try {
            const targetUserId = userId || currentUser?.id;
            if (!targetUserId) {
                console.log('⚠️ لا يوجد مستخدم محدد');
                return this.getDefaultStats();
            }

            const { data, error } = await supabase
                .from('user_network_stats')
                .select('*')
                .eq('user_id', targetUserId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // no rows
                    console.log('⚠️ لا توجد إحصائيات، جاري إنشاء إحصائيات افتراضية');
                    return this.getDefaultStats();
                }
                throw error;
            }

            console.log('✅ تم جلب الإحصائيات:', data);
            return data;

        } catch (error) {
            console.error('❌ خطأ في جلب الإحصائيات:', error);
            return this.getDefaultStats();
        }
    }

    // الحصول على الإحصائيات الافتراضية
    static getDefaultStats() {
        return {
            direct_referrals: 0,
            total_network: 0,
            level_1_count: 0,
            level_2_count: 0,
            level_3_count: 0,
            level_4_count: 0,
            level_5_count: 0
        };
    }

    // الحصول على الإحالات المباشرة
    static async getDirectReferrals(userId = null) {
        try {
            const targetUserId = userId || currentUser?.id;
            if (!targetUserId) return [];

            const { data, error } = await supabase
                .from('referrals')
                .select(`
                    *,
                    referred_user:referred_id(
                        email,
                        raw_user_meta_data,
                        created_at
                    )
                `)
                .eq('referrer_id', targetUserId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`✅ تم جلب ${data?.length || 0} إحالة مباشرة`);
            return data || [];

        } catch (error) {
            console.error('❌ خطأ في جلب الإحالات المباشرة:', error);
            return [];
        }
    }

    // الحصول على الشبكة الكاملة
    static async getFullNetwork(userId = null) {
        try {
            const targetUserId = userId || currentUser?.id;
            if (!targetUserId) return [];

            const { data, error } = await supabase
                .from('network_tree')
                .select(`
                    *,
                    network_user:user_id(
                        email,
                        raw_user_meta_data,
                        created_at
                    ),
                    referrer:referrer_id(
                        email,
                        raw_user_meta_data
                    )
                `)
                .eq('referrer_id', targetUserId)
                .lte('depth', 5)
                .order('depth', { ascending: true })
                .order('created_at', { ascending: true });

            if (error) throw error;

            console.log(`✅ تم جلب ${data?.length || 0} عنصر في الشبكة`);
            return data || [];

        } catch (error) {
            console.error('❌ خطأ في جلب الشبكة الكاملة:', error);
            return [];
        }
    }

    // توليد رمز إحالة عشوائي
    static generateReferralCode(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // التحقق من صحة رمز الإحالة
    static async validateReferralCode(code) {
        try {
            if (!code || code.length < 6) return false;

            const { data, error } = await supabase
                .from('referral_codes')
                .select('user_id, code')
                .eq('code', code.toUpperCase().trim())
                .single();

            return !error && data !== null;
        } catch (error) {
            console.error('❌ خطأ في التحقق من رمز الإحالة:', error);
            return false;
        }
    }
                }
