// posts.js - إضافة وظيفة النشر (معدل)
class Posts {
    static async loadPosts() {
        try {
            const { data: posts, error } = await supabase
                .from('marketing')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            this.displayPosts(posts);
        } catch (error) {
            console.error('Error loading posts:', error);
            Utils.showStatus(`خطأ في تحميل المنشورات: ${error.message}`, 'error', 'connection-status');
        }
    }

    static async publishPost(postData) {
        try {
            let imageUrl = null;
            
            // رفع الصورة إذا وجدت
            if (postData.imageFile && postData.imageFile.size > 0) {
                imageUrl = await this.uploadImage(postData.imageFile);
            }

            // إضافة المنشور إلى قاعدة البيانات
            const { data, error } = await supabase
                .from('marketing')
                .insert([{ 
                    name: postData.name,
                    description: postData.description, 
                    location: postData.location,
                    category: postData.category,
                    price: parseFloat(postData.price),
                    image_url: imageUrl,
                    user_id: currentUser.email
                }]);
            
            if (error) throw error;
            
            // إعادة تحميل المنشورات
            this.loadPosts();
            return true;
        } catch (error) {
            console.error('Error publishing post:', error);
            throw error;
        }
    }

    static async uploadImage(file) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            
            const { data, error } = await supabase.storage
                .from('marketing')
                .upload(fileName, file);
            
            if (error) throw error;
            
            const { data: { publicUrl } } = supabase.storage
                .from('marketing')
                .getPublicUrl(fileName);
            
            return publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    static displayPosts(posts) {
        const postsContainer = document.getElementById('posts-container');
        if (!postsContainer) return;
        
        postsContainer.innerHTML = '';
        
        if (!posts || posts.length === 0) {
            postsContainer.innerHTML = '<p>لا توجد منشورات بعد.</p>';
            return;
        }
        
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'post-card';
            postElement.style.cursor = 'pointer'; // جعل المنشور قابلاً للنقر
            
            const imageHtml = post.image_url 
                ? `<img src="${post.image_url}" alt="${post.name}" class="post-image">`
                : `<div class="post-image no-image">لا توجد صورة</div>`;
            
            postElement.innerHTML = `
                ${imageHtml}
                <h3 class="post-title">${post.name}</h3>
                <p class="post-description">${post.description}</p>
                <div class="post-details">
                    <span class="post-detail post-price"><i class="fas fa-money-bill-wave"></i> ${Utils.formatPrice(post.price)}</span>
                    <span class="post-detail"><i class="fas fa-tag"></i> ${post.category}</span>
                    <span class="post-detail"><i class="fas fa-map-marker-alt"></i> ${post.location}</span>
                </div>
                <div class="post-author">
                    <i class="fas fa-user"></i> 
                    ${post.user_id ? `تم النشر بواسطة: ${post.user_id}` : 'مستخدم غير معروف'}
                </div>
                <small>${new Date(post.created_at).toLocaleString('ar-SA')}</small>
            `;
            
            // إضافة event listener للنقر على المنشور
            postElement.addEventListener('click', () => {
                Navigation.showPage('post-details', { postId: post.id });
            });
            
            postsContainer.appendChild(postElement);
        });
    }
}