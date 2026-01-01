// 电影管理后台JavaScript
$(document).ready(function() {
    // 显示选择的文件名
    $('#cover-image').change(function() {
        const fileName = $(this).val().split('\\').pop();
        $('#cover-file-name').text(fileName);
    });

    // 随机生成卡密按钮点击事件
    $('#random-card-key-btn').click(function() {
        // 生成16位随机字符串作为卡密
        const randomKey = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10).toUpperCase();
        $('#card-key').val(randomKey);
        // 自动显示网址输入框
        $('#url-input-container').show();
    });
    
    // 电影名称变化时，自动生成卡密和网址
    $('#movie-name').on('input', function() {
        const movieName = $(this).val().trim();
        if (movieName) {
            // 使用电影名称作为卡密
            const cardKey = movieName;
            $('#card-key').val(cardKey);
            
            // 自动显示网址输入框
            $('#url-input-container').show();
        }
    });

    // 电影名称实时查重
    let titleCheckTimeout;
    $('#movie-name').on('input', function() {
        const title = $(this).val().trim();
        const titleCheckMessage = $('#title-check-message');
        
        if (!title) {
            titleCheckMessage.text('').removeClass('text-danger text-success');
            return;
        }
        
        // 防抖处理，避免频繁请求
        clearTimeout(titleCheckTimeout);
        titleCheckTimeout = setTimeout(() => {
            $.ajax({
                url: '/api/movies/check-title',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ title: title }),
                success: function(response) {
                    if (response.isDuplicate) {
                        titleCheckMessage.text('电影名称已存在').addClass('text-danger').removeClass('text-success');
                    } else {
                        titleCheckMessage.text('电影名称可用').addClass('text-success').removeClass('text-danger');
                    }
                },
                error: function() {
                    titleCheckMessage.text('').removeClass('text-danger text-success');
                }
            });
        }, 300); // 300ms延迟，确保响应时间不超过500ms
    });
    
    // 卡密输入完成后显示网址输入框
    $('#card-key').on('input', function() {
        const cardKey = $(this).val().trim();
        const urlInputContainer = $('#url-input-container');
        
        // 网址输入框一直显示
        urlInputContainer.show();
    });



    // 表单验证
    $('#movie-form').submit(function(e) {
        e.preventDefault();
        
        // 获取表单数据
        const movieName = $('#movie-name').val().trim();
        const cardKey = $('#card-key').val().trim();
        const movieUrl = $('#movie-url').val().trim();
        const coverImage = $('#cover-image')[0].files[0];
        
        // 验证电影名称
        if (!movieName) {
            showAlert('请输入电影名称', 'danger');
            return;
        }
        
        // 验证电影名称长度
        if (movieName.length > 50) {
            showAlert('电影名称不能超过50个字符', 'danger');
            return;
        }
        
        // 如果提供了封面图片，验证图片类型和大小
        if (coverImage) {
            // 验证封面图片类型
            const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
            if (!allowedImageTypes.includes(coverImage.type)) {
                showAlert('封面图片只能是JPEG、PNG、GIF、WebP或AVIF格式', 'danger');
                return;
            }
            
            // 验证封面图片大小 (最大5MB)
            const maxImageSize = 5 * 1024 * 1024;
            if (coverImage.size > maxImageSize) {
                showAlert('封面图片大小不能超过5MB', 'danger');
                return;
            }
        }
        
        // 显示上传进度
        showUploadProgress();
        
        // 准备FormData
        const formData = new FormData();
        formData.append('movieName', movieName);
        formData.append('cardKey', cardKey);
        formData.append('movieUrl', movieUrl);
        
        // 添加文件到FormData（如果提供）
        if (coverImage) {
            formData.append('coverImage', coverImage);
        }
        
        // 真实上传过程
        uploadMovie(formData);
    });

    // 链接显示与复制功能
    function showMovieLink(movieId) {
        const baseUrl = window.location.origin;
        const movieLink = `${baseUrl}?id=${movieId}`;
        
        $('#movie-link').val(movieLink);
        $('#link-container').show();
    }

    // 复制链接功能
    $('#copy-link-btn').click(function() {
        const link = $('#movie-link').val();
        
        // 使用Clipboard API复制链接
        if (navigator.clipboard) {
            navigator.clipboard.writeText(link).then(function() {
                showCopySuccess();
            }).catch(function() {
                // 降级方案
                fallbackCopyTextToClipboard(link);
            });
        } else {
            // 降级方案
            fallbackCopyTextToClipboard(link);
        }
    });

    // 复制成功提示
    function showCopySuccess() {
        const toast = $('#copy-success-toast');
        toast.fadeIn(300);
        setTimeout(function() {
            toast.fadeOut(300);
        }, 1000);
    }

    // 复制链接的降级方案
    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showCopySuccess();
        } catch (err) {
            showAlert('复制失败，请手动复制', 'danger');
        }
        
        document.body.removeChild(textArea);
    }
    
    // 上传进度相关变量
    let startTime;
    let lastLoaded = 0;
    let lastTime = 0;
    
    // 显示上传进度
    function showUploadProgress() {
        $('#upload-progress').show();
        // 添加预计剩余时间显示
        if ($('#estimated-time').length === 0) {
            $('.progress').after('<div id="estimated-time" style="margin-top: 10px; font-size: 0.9rem; color: #666; text-align: center;"></div>');
        }
        startTime = Date.now();
        lastLoaded = 0;
        lastTime = 0;
    }
    
    // 真实上传过程 - 优化版
    function uploadMovie(formData) {
        $.ajax({
            url: '/api/movies',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            xhr: function() {
                const xhr = new window.XMLHttpRequest();
                // 监听上传进度
                xhr.upload.addEventListener('progress', function(evt) {
                    if (evt.lengthComputable) {
                        const loaded = evt.loaded;
                        const total = evt.total;
                        const percentComplete = Math.round((loaded / total) * 100);
                        
                        // 计算预计剩余时间
                        const elapsedTime = Date.now() - startTime;
                        const uploadSpeed = calculateUploadSpeed(loaded, elapsedTime);
                        const estimatedTime = calculateEstimatedTime(loaded, total, uploadSpeed);
                        
                        updateProgress(percentComplete, estimatedTime, uploadSpeed);
                    }
                }, false);
                return xhr;
            },
            success: function(response) {
                $('#upload-progress').hide();
                $('#estimated-time').remove();
                updateProgress(0);
                showAlert('电影添加成功！', 'success');
                
                // 重置表单
                $('#movie-form')[0].reset();
                $('#cover-file-name').text('');
                
                // 刷新电影列表
                loadMovieList();
            },
            error: function(xhr, status, error) {
                $('#upload-progress').hide();
                $('#estimated-time').remove();
                updateProgress(0);
                const errorMessage = xhr.responseJSON ? xhr.responseJSON.error : '上传失败，请重试！';
                showAlert(errorMessage, 'danger');
            }
        });
    }
    
    // 计算上传速度 (字节/秒)
    function calculateUploadSpeed(loaded, elapsedTime) {
        const now = Date.now();
        const timeDiff = now - lastTime;
        const bytesDiff = loaded - lastLoaded;
        
        if (timeDiff === 0) return 0;
        
        // 保存当前状态
        lastLoaded = loaded;
        lastTime = now;
        
        return bytesDiff / (timeDiff / 1000);
    }
    
    // 计算预计剩余时间 (秒)
    function calculateEstimatedTime(loaded, total, uploadSpeed) {
        if (uploadSpeed === 0) return 0;
        
        const remainingBytes = total - loaded;
        return remainingBytes / uploadSpeed;
    }
    
    // 格式化时间 (秒 -> mm:ss)
    function formatTime(seconds) {
        if (seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    
    // 更新进度条 - 优化版
    function updateProgress(percentage, estimatedTime = 0, uploadSpeed = 0) {
        const progressBar = $('.progress-bar');
        progressBar.css('width', percentage + '%');
        progressBar.text(percentage + '%');
        progressBar.attr('aria-valuenow', percentage);
        
        // 更新预计剩余时间
        if (estimatedTime > 0) {
            const formattedTime = formatTime(estimatedTime);
            const formattedSpeed = formatFileSize(uploadSpeed);
            $('#estimated-time').text(`预计剩余时间: ${formattedTime} | 上传速度: ${formattedSpeed}/s`);
        }
    }
    
    // 显示提示信息
    function showAlert(message, type) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <strong>${type === 'success' ? '成功！' : '错误！'}</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        $('#alert-container').html(alertHtml);
        
        // 3秒后自动关闭提示
        setTimeout(function() {
            $('.alert').alert('close');
        }, 3000);
    }
    
    // 加载电影列表 - 优化版
    function loadMovieList() {
        // 显示加载动画
        $('#movie-list').html('<div class="col-12 text-center py-5"><i class="fa fa-spinner fa-spin fa-3x text-primary"></i><p class="mt-3">加载中...</p></div>');
        
        // 从服务器获取电影列表
        $.ajax({
            url: '/api/movies',
            type: 'GET',
            dataType: 'json',
            success: function(movies) {
                if (movies.length === 0) {
                    $('#movie-list').html('<div class="col-12 text-center py-5"><i class="fa fa-film fa-3x text-secondary"></i><p class="mt-3">暂无电影数据</p></div>');
                    return;
                }
                
                // 生成电影列表HTML
                let movieListHtml = '';
                movies.forEach(function(movie) {
                    // 确保poster路径正确
                    let posterUrl = movie.poster;
                    if (!posterUrl.startsWith('http') && !posterUrl.startsWith('/')) {
                        posterUrl = '/' + posterUrl;
                    }
                    
                    movieListHtml += `
                        <div class="col">
                            <div class="movie-item">
                                <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" onerror="this.onerror=null; this.src='https://picsum.photos/300/400';">
                                <div class="movie-info">
                                    <h5 class="movie-title">${movie.title}</h5>
                                    <div class="d-flex gap-2">
                                        <button class="btn btn-primary btn-sm change-movie" data-id="${movie.id}" data-title="${movie.title}">
                                            <i class="fa fa-edit"></i> 更改
                                        </button>
                                        <button class="btn btn-danger btn-sm delete-movie" data-id="${movie.id}" data-title="${movie.title}">
                                            <i class="fa fa-trash"></i> 删除
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                $('#movie-list').html(movieListHtml);
                
                // 绑定删除按钮事件
                bindDeleteEvents();
                // 绑定更改按钮事件
                bindChangeEvents();
            },
            error: function(xhr, status, error) {
                $('#movie-list').html('<div class="col-12 text-center py-5"><i class="fa fa-exclamation-triangle fa-3x text-danger"></i><p class="mt-3">加载失败，请重试</p></div>');
            }
        });
    }
    
    // 绑定删除按钮事件
    function bindDeleteEvents() {
        $('.delete-movie').click(function() {
            const movieId = $(this).data('id');
            const movieTitle = $(this).data('title');
            
            // 确认删除
            if (confirm(`确定要删除电影 "${movieTitle}" 吗？此操作不可恢复！`)) {
                // 发送删除请求
                $.ajax({
                    url: `/api/movies/${movieId}`,
                    type: 'DELETE',
                    dataType: 'json',
                    success: function(response) {
                        showAlert('电影删除成功！', 'success');
                        loadMovieList();
                    },
                    error: function(xhr, status, error) {
                        const errorMessage = xhr.responseJSON ? xhr.responseJSON.error : '删除失败，请重试！';
                        showAlert(errorMessage, 'danger');
                    }
                });
            }
        });
    }
    
    // 绑定更改按钮事件
    function bindChangeEvents() {
        $('.change-movie').click(function() {
            const movieId = $(this).data('id');
            const movieTitle = $(this).data('title');
            
            // 弹出更改操作菜单
            showChangeMenu(movieId, movieTitle);
        });
    }
    
    // 显示更改操作菜单
    function showChangeMenu(movieId, movieTitle) {
        // 创建更改菜单HTML
        const changeMenuHtml = `
            <div class="modal fade" id="changeMovieModal" tabindex="-1" aria-labelledby="changeMovieModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="changeMovieModalLabel">
                                <i class="fa fa-edit"></i> 更改电影 "${movieTitle}"
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="change-movie-form">
                                <input type="hidden" id="movie-id" value="${movieId}">
                                
                                <div class="mb-4">
                                    <label for="new-card-key" class="form-label">
                                        <i class="fa fa-key"></i> 卡密
                                    </label>
                                    <input type="text" class="form-control" id="new-card-key" placeholder="请输入新的卡密（留空则不修改）">
                                </div>
                                
                                <div class="mb-4" id="modal-url-input-container" style="display: none;">
                                    <label for="new-movie-url" class="form-label">
                                        <i class="fa fa-link"></i> 网址
                                    </label>
                                    <input type="text" class="form-control" id="new-movie-url" placeholder="请输入电影的完整网址链接（留空则不修改）">
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-primary" id="save-changes-btn">保存更改</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除已存在的模态框
        $('#changeMovieModal').remove();
        
        // 添加新模态框到页面
        $('body').append(changeMenuHtml);
        
        // 显示模态框
        const changeMovieModal = new bootstrap.Modal('#changeMovieModal');
        changeMovieModal.show();
        
        // 模态对话框中的卡密验证逻辑
        $('#new-card-key').on('input', function() {
            const cardKey = $(this).val().trim();
            const modalUrlInputContainer = $('#modal-url-input-container');
            
            // 这里应该添加卡密验证逻辑，现在先简化处理
            if (cardKey) {
                // 假设卡密验证通过
                modalUrlInputContainer.show();
            } else {
                modalUrlInputContainer.hide();
            }
        });
        
        // 绑定保存更改按钮事件
        $('#save-changes-btn').click(function() {
            saveMovieChanges();
        });
    }
    
    // 保存电影更改
    function saveMovieChanges() {
        const movieId = $('#movie-id').val();
        const newCardKey = $('#new-card-key').val().trim();
        const newMovieUrl = $('#new-movie-url').val().trim();
        
        // 确认保存
        if (!confirm('确定要保存更改吗？')) {
            return;
        }
        
        // 准备更新数据
        const updateData = {};
        if (newCardKey !== '') {
            updateData.cardKey = newCardKey;
        }
        if (newMovieUrl !== '') {
            // 这里可以添加网址验证逻辑
            updateData.movieUrl = newMovieUrl;
        }
        
        // 如果没有要更新的数据，直接关闭模态框
        if (Object.keys(updateData).length === 0) {
            // 使用Bootstrap 5的API关闭模态框
            const changeMovieModal = bootstrap.Modal.getInstance(document.getElementById('changeMovieModal'));
            if (changeMovieModal) {
                changeMovieModal.hide();
            }
            showAlert('没有要更新的数据', 'info');
            return;
        }
        
        // 发送更新请求
        $.ajax({
            url: `/api/movies/${movieId}`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(updateData),
            success: function(response) {
                // 使用Bootstrap 5的API关闭模态框
                const changeMovieModal = bootstrap.Modal.getInstance(document.getElementById('changeMovieModal'));
                if (changeMovieModal) {
                    changeMovieModal.hide();
                }
                showAlert('电影信息更新成功！', 'success');
                loadMovieList();
            },
            error: function(xhr, status, error) {
                const errorMessage = xhr.responseJSON ? xhr.responseJSON.error : '更新失败，请重试！';
                showAlert(errorMessage, 'danger');
            }
        });
    }
    
    // 初始化页面
    loadMovieList();
});