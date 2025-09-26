// js/referral.js - الإصدار المصحح
class ReferralSystem {
    static async createReferralCode() {
        try {
            if (!currentUser) throw new Error('يجب تسجيل الدخول');

            const code = this.generateReferralCode(8);
            console.log('Creating referral code:', code);

            const { data, error } = await supabase
                .from('referral_codes')
                .insert([{
                    user_id: currentUser.id,
                    code: code,
                    is_active: true
                }])
                .select()
                .single();

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            console.log('Referral code created successfully:', data);
            return data;
        } catch (error) {
            console.error('Error creating referral code:', error);
            throw error;
        }
    }

    static generateReferralCode(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    static async getUserReferralCode() {
        try {
            if (!currentUser) {
                console.log('No current user');
                return null;
            }

            const { data, error } = await supabase
                .from('referral_codes')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('is_active', true)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('No referral code found for user, will create one');
                    return null;
                }
                console.error('Error getting referral code:', error);
                return null;
            }

            console.log('Found referral code:', data);
            return data;
        } catch (error) {
            console.error('Exception getting referral code:', error);
            return null;
        }
    }

    static async processReferral(referralCode, newUserId) {
        try {
            console.log('Processing referral:', referralCode, 'for user:', newUserId);

            if (!referralCode || !newUserId) {
                console.log('Missing referral code or user ID');
                return false;
            }

            const { data: codeData, error: codeError } = await supabase
                .from('referral_codes')
                .select('*')
                .eq('code', referralCode.toUpperCase())
                .eq('is_active', true)
                .single();

            if (codeError || !codeData) {
                console.log('Invalid referral code:', referralCode);
                return false;
            }

            console.log('Found valid referral code:', codeData);

            // إنشاء سجل الإحالة
            const { error: referralError } = await supabase
                .from('referrals')
                .insert([{
                    referrer_id: codeData.user_id,
                    referred_id: newUserId,
                    referral_code_id: codeData.id,
                    status: 'active',
                    joined_at: new Date().toISOString()
                }]);

            if (referralError) {
                console.error('Error creating referral:', referralError);
                return false;
            }

            console.log('Referral record created successfully');

            // تحديث عدد الاستخدامات
            await supabase
                .from('referral_codes')
                .update({ 
                    current_uses: (codeData.current_uses || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', codeData.id);

            // بناء الشجرة
            await this.buildNetworkTree(newUserId, codeData.user_id);

            return true;
        } catch (error) {
            console.error('Error in processReferral:', error);
            return false;
        }
    }

    static async buildNetworkTree(newUserId, parentId) {
        try {
            console.log('Building network tree for:', newUserId, 'parent:', parentId);

            let depth = 1;
            let lineagePath = [parentId];

            // البحث عن الأب في الشجرة
            const { data: parentData } = await supabase
                .from('network_tree')
                .select('*')
                .eq('user_id', parentId)
                .single();

            if (parentData) {
                depth = parentData.depth + 1;
                lineagePath = [...parentData.lineage_path, parentId];
            }

            // إضافة المستخدم الجديد
            const { error } = await supabase
                .from('network_tree')
                .insert([{
                    user_id: newUserId,
                    parent_id: parentId,
                    depth: depth,
                    lineage_path: lineagePath
                }]);

            if (error) throw error;

            console.log('Network tree built successfully');

            // تحديث الإحصائيات
            await this.updateNetworkStats(parentId);

        } catch (error) {
            console.error('Error building network tree:', error);
        }
    }

    static async updateNetworkStats(userId) {
        try {
            console.log('Updating network stats for:', userId);

            // الإحالات المباشرة
            const { count: directCount } = await supabase
                .from('referrals')
                .select('*', { count: 'exact', head: true })
                .eq('referrer_id', userId)
                .eq('status', 'active');

            // الشبكة الكاملة
            const { data: networkData } = await supabase
                .from('network_tree')
                .select('depth')
                .eq('parent_id', userId);

            const levelStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            if (networkData) {
                networkData.forEach(item => {
                    if (item.depth <= 5) {
                        levelStats[item.depth] = (levelStats[item.depth] || 0) + 1;
                    }
                });
            }

            const totalNetworkCount = Object.values(levelStats).reduce((a, b) => a + b, 0);

            // تحديث الإحصائيات
            const { error } = await supabase
                .from('user_network_stats')
                .upsert({
                    user_id: userId,
                    direct_referrals_count: directCount || 0,
                    total_network_count: totalNetworkCount,
                    level_1_count: levelStats[1] || 0,
                    level_2_count: levelStats[2] || 0,
                    level_3_count: levelStats[3] || 0,
                    level_4_count: levelStats[4] || 0,
                    level_5_count: levelStats[5] || 0,
                    last_updated: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            console.log('Network stats updated successfully for user:', userId);

        } catch (error) {
            console.error('Error updating network stats:', error);
        }
    }

    static async getUserNetworkStats(userId = null) {
        try {
            const targetUserId = userId || currentUser?.id;
            if (!targetUserId) {
                console.log('No user ID provided');
                return null;
            }

            const { data, error } = await supabase
                .from('user_network_stats')
                .select('*')
                .eq('user_id', targetUserId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('No network stats found for user, returning defaults');
                    return {
                        direct_referrals_count: 0,
                        total_network_count: 0,
                        level_1_count: 0,
                        level_2_count: 0,
                        level_3_count: 0,
                        level_4_count: 0,
                        level_5_count: 0
                    };
                }
                throw error;
            }

            console.log('Network stats found:', data);
            return data;
        } catch (error) {
            console.error('Error getting network stats:', error);
            return {
                direct_referrals_count: 0,
                total_network_count: 0,
                level_1_count: 0,
                level_2_count: 0,
                level_3_count: 0,
                level_4_count: 0,
                level_5_count: 0
            };
        }
    }

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
                        raw_user_meta_data
                    )
                `)
                .eq('referrer_id', targetUserId)
                .eq('status', 'active')
                .order('joined_at', { ascending: false });

            if (error) {
                console.error('Error getting direct referrals:', error);
                return [];
            }

            console.log('Direct referrals found:', data?.length || 0);
            return data || [];
        } catch (error) {
            console.error('Exception getting direct referrals:', error);
            return [];
        }
    }

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
                        raw_user_meta_data
                    )
                `)
                .eq('parent_id', targetUserId)
                .lte('depth', 5)
                .order('depth', { ascending: true });

            if (error) {
                console.error('Error getting full network:', error);
                return [];
            }

            console.log('Full network found:', data?.length || 0);
            return data || [];
        } catch (error) {
            console.error('Exception getting full network:', error);
            return [];
        }
    }
                        }
