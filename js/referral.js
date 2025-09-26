// js/referral.js - Referral System (English function names)
class ReferralSystem {
    // Create new referral code for user
    static async createReferralCode() {
        try {
            if (!currentUser) {
                throw new Error('User must be logged in to create referral code');
            }

            const code = this.generateReferralCode(8);
            
            const { data, error } = await supabase
                .from('referral_codes')
                .insert([{
                    user_id: currentUser.id,
                    code: code,
                    is_active: true
                }])
                .select()
                .single();

            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('Error creating referral code:', error);
            throw error;
        }
    }

    // Generate random referral code
    static generateReferralCode(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Get user's referral code
    static async getUserReferralCode() {
        try {
            if (!currentUser) return null;

            const { data, error } = await supabase
                .from('referral_codes')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('is_active', true)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            
            return data;
        } catch (error) {
            console.error('Error getting user referral code:', error);
            return null;
        }
    }

    // Process referral during registration
    static async processReferral(referralCode, newUserId) {
        try {
            const { data: codeData, error: codeError } = await supabase
                .from('referral_codes')
                .select('*, user:user_id(*)')
                .eq('code', referralCode.toUpperCase())
                .eq('is_active', true)
                .single();

            if (codeError || !codeData) {
                console.log('Invalid or inactive referral code');
                return false;
            }

            if (codeData.max_uses && codeData.current_uses >= codeData.max_uses) {
                console.log('Maximum uses reached for this referral code');
                return false;
            }

            const { data: referralData, error: referralError } = await supabase
                .from('referrals')
                .insert([{
                    referrer_id: codeData.user_id,
                    referred_id: newUserId,
                    referral_code_id: codeData.id,
                    status: 'active'
                }])
                .select()
                .single();

            if (referralError) throw referralError;

            await supabase
                .from('referral_codes')
                .update({ 
                    current_uses: codeData.current_uses + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', codeData.id);

            await this.buildNetworkTree(newUserId, codeData.user_id);
            await this.updateNetworkStats(codeData.user_id);

            return true;
        } catch (error) {
            console.error('Error processing referral:', error);
            return false;
        }
    }

    // Build hierarchical network tree
    static async buildNetworkTree(newUserId, parentId) {
        try {
            const { data: parentData, error: parentError } = await supabase
                .from('network_tree')
                .select('*')
                .eq('user_id', parentId)
                .single();

            let depth = 0;
            let lineagePath = [parentId];

            if (parentData && !parentError) {
                depth = parentData.depth + 1;
                lineagePath = [...parentData.lineage_path, parentId];
            }

            const { error: treeError } = await supabase
                .from('network_tree')
                .insert([{
                    user_id: newUserId,
                    parent_id: parentId,
                    depth: depth,
                    lineage_path: lineagePath
                }]);

            if (treeError) throw treeError;

            await this.updateAncestorsStats(parentId);

        } catch (error) {
            console.error('Error building network tree:', error);
        }
    }

    // Update ancestors statistics
    static async updateAncestorsStats(userId) {
        try {
            const { data: ancestors, error } = await supabase
                .from('network_tree')
                .select('user_id')
                .contains('lineage_path', [userId]);

            if (error) throw error;

            if (ancestors && ancestors.length > 0) {
                for (const ancestor of ancestors) {
                    await this.updateNetworkStats(ancestor.user_id);
                }
            }
        } catch (error) {
            console.error('Error updating ancestors stats:', error);
        }
    }

    // Update network statistics for a user
    static async updateNetworkStats(userId) {
        try {
            const { count: directCount, error: directError } = await supabase
                .from('referrals')
                .select('*', { count: 'exact', head: true })
                .eq('referrer_id', userId)
                .eq('status', 'active');

            if (directError) throw directError;

            const { data: networkData, error: networkError } = await supabase
                .from('network_tree')
                .select('depth')
                .eq('parent_id', userId);

            if (networkError) throw networkError;

            const levelStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            if (networkData) {
                networkData.forEach(item => {
                    if (item.depth >= 1 && item.depth <= 5) {
                        levelStats[item.depth]++;
                    }
                });
            }

            const totalNetworkCount = Object.values(levelStats).reduce((a, b) => a + b, 0);

            const { error: upsertError } = await supabase
                .from('user_network_stats')
                .upsert({
                    user_id: userId,
                    direct_referrals_count: directCount || 0,
                    total_network_count: totalNetworkCount,
                    level_1_count: levelStats[1],
                    level_2_count: levelStats[2],
                    level_3_count: levelStats[3],
                    level_4_count: levelStats[4],
                    level_5_count: levelStats[5],
                    last_updated: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (upsertError) throw upsertError;

        } catch (error) {
            console.error('Error updating network stats:', error);
        }
    }

    // Get user network statistics
    static async getUserNetworkStats(userId = null) {
        try {
            const targetUserId = userId || currentUser?.id;
            if (!targetUserId) return null;

            const { data, error } = await supabase
                .from('user_network_stats')
                .select('*')
                .eq('user_id', targetUserId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            
            return data;
        } catch (error) {
            console.error('Error getting user network stats:', error);
            return null;
        }
    }

    // Get direct referrals list
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

            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Error getting direct referrals:', error);
            return [];
        }
    }

    // Get full network tree (limited by depth)
    static async getFullNetwork(userId = null, maxDepth = 5) {
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
                .lte('depth', maxDepth)
                .order('depth', { ascending: true })
                .order('created_at', { ascending: true });

            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Error getting full network:', error);
            return [];
        }
    }
            }1
