// 简单电影管理后台服务器脚本 - 不依赖multer
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

const PORT = 3000;



// 生成10,000个卡密并保存到cards.json
function generateCardKeys() {
    const cardsPath = path.join(__dirname, 'cards.json');
    let cardsData;
    
    try {
        // 检查文件是否存在
        if (fs.existsSync(cardsPath)) {
            cardsData = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
            if (cardsData.validCards && cardsData.validCards.length >= 10000) {
                console.log('已有足够的卡密，无需重新生成');
                return;
            }
        }
    } catch (error) {
        console.log('生成新的卡密文件');
        cardsData = { validCards: [] };
    }
    
    // 生成10,000个唯一的卡密
    const cardKeys = new Set();
    while (cardKeys.size < 10000) {
        // 生成16位随机字符串作为卡密
        const randomKey = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10).toUpperCase();
        cardKeys.add(randomKey);
    }
    
    cardsData.validCards = Array.from(cardKeys);
    fs.writeFileSync(cardsPath, JSON.stringify(cardsData, null, 2), 'utf8');
    console.log('成功生成10,000个卡密');
}

// 读取电影数据
function readMovies() {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'movies.json'), 'utf8'));
    } catch (error) {
        return [];
    }
}

// 写入电影数据
function writeMovies(movies) {
    fs.writeFileSync(path.join(__dirname, 'movies.json'), JSON.stringify(movies, null, 2), 'utf8');
}

// 更新index.html中的电影数据
function updateIndexHtmlMovies(movies) {
    try {
        // 读取index.html文件
        let indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
        
        // 生成新的电影数据字符串
        const moviesJson = JSON.stringify(movies, null, 4);
        
        // 替换index.html中的电影数据 - 兼容不同换行符格式
        const updatedHtml = indexHtml.replace(
            /\/\/ 电影数据 - 将通过API动态获取[\r\n]+        let movies = \[[\s\S]*?\];/, 
            `// 电影数据 - 将通过API动态获取
        let movies = ${moviesJson};
        `
        );
        
        // 保存更新后的index.html
        fs.writeFileSync(path.join(__dirname, 'index.html'), updatedHtml, 'utf8');
        console.log('index.html中的电影数据已更新');
    } catch (error) {
        console.error('更新index.html失败:', error);
    }
}

// 处理文件上传 - 优化版
function handleFileUpload(req, res, callback) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
        sendJsonResponse(res, 400, { success: false, error: '不支持的请求格式' });
        return;
    }
    
    const boundary = contentType.split('; ')[1].replace('boundary=', '');
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    let buffer = Buffer.alloc(0);
    
    req.on('data', chunk => {
        buffer = Buffer.concat([buffer, chunk]);
    });
    
    req.on('end', () => {
        const formData = {};
        const files = {};
        
        // 分割buffer为各个部分
        let currentPosition = 0;
        
        while (currentPosition < buffer.length) {
            // 找到下一个boundary
            const boundaryIndex = buffer.indexOf(boundaryBuffer, currentPosition);
            if (boundaryIndex === -1) break;
            
            const partBuffer = buffer.slice(currentPosition, boundaryIndex);
            currentPosition = boundaryIndex + boundaryBuffer.length;
            
            // 跳过空部分
            if (partBuffer.length < 4) continue;
            
            // 找到header和content的分隔符\r\n\r\n
            const headerEndIndex = partBuffer.indexOf(Buffer.from('\r\n\r\n'));
            if (headerEndIndex === -1) continue;
            
            const headerBuffer = partBuffer.slice(0, headerEndIndex);
            const header = headerBuffer.toString('utf8');
            
            // 解析Content-Disposition，支持带有连字符的字段名
            const contentDisposition = header.match(/Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/);
            if (!contentDisposition) continue;
            
            const [, name, filename] = contentDisposition;
            
            if (filename) {
                // 处理文件 - 提取二进制内容
                const fileContentStart = headerEndIndex + 4;
                const fileContentEnd = partBuffer.length - 2; // 减去最后的\r\n
                // 确保文件内容范围有效
                if (fileContentStart < fileContentEnd) {
                    const fileBuffer = partBuffer.slice(fileContentStart, fileContentEnd);
                    const contentTypeMatch = header.match(/Content-Type: ([^\r\n]+)/);
                    const fileContentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';
                    
                    files[name] = {
                        filename: filename,
                        contentType: fileContentType,
                        content: fileBuffer
                    };
                }
            } else {
                // 处理普通字段
                const content = partBuffer.slice(headerEndIndex + 4, partBuffer.length - 2).toString('utf8');
                formData[name] = content;
            }
        }
        
        callback(formData, files);
    });
}

// 发送JSON响应
function sendJsonResponse(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// 发送文件响应
function sendFileResponse(res, filePath) {
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
        case '.jpeg':
            contentType = 'image/jpeg';
            break;
        case '.gif':
            contentType = 'image/gif';
            break;
        case '.webp':
            contentType = 'image/webp';
            break;
        case '.avif':
            contentType = 'image/avif';
            break;
        case '.mp4':
            contentType = 'video/mp4';
            break;
        case '.webm':
            contentType = 'video/webm';
            break;
    }
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            // 对于二进制文件（图像、视频）不指定编码
            if (contentType.startsWith('image/') || contentType.startsWith('video/')) {
                res.end(content);
            } else {
                // 文本文件使用utf8编码
                res.end(content, 'utf8');
            }
        }
    });
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;
    
    // 处理静态文件
    if (pathname === '/') {
        sendFileResponse(res, path.join(__dirname, 'index.html'));
        return;
    } else if (pathname === '/admin') {
        sendFileResponse(res, path.join(__dirname, 'admin.html'));
        return;
    } else if (pathname === '/admin.js') {
        sendFileResponse(res, path.join(__dirname, 'admin.js'));
        return;
    } else if (pathname === '/cards.json') {
        sendFileResponse(res, path.join(__dirname, 'cards.json'));
        return;
    }

    // API路由
    if (pathname === '/api/movies' && req.method === 'GET') {
        // 获取电影列表
        const movies = readMovies();
        sendJsonResponse(res, 200, movies);
        return;
    } else if (pathname === '/api/movies/check-title' && req.method === 'POST') {
        // 电影名称查重
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const title = data.title;
                const excludeId = data.excludeId || null;
                
                if (!title) {
                    sendJsonResponse(res, 400, { success: false, error: '缺少电影名称' });
                    return;
                }
                
                const movies = readMovies();
                const isDuplicate = movies.some(movie => 
                    movie.title === title && movie.id !== excludeId
                );
                
                sendJsonResponse(res, 200, { 
                    success: true, 
                    isDuplicate: isDuplicate,
                    message: isDuplicate ? '电影名称已存在' : '电影名称可用'
                });
            } catch (error) {
                sendJsonResponse(res, 500, { success: false, error: error.message });
            }
        });
        return;
    } else if (pathname === '/api/movies' && req.method === 'POST') {
        // 添加电影
        handleFileUpload(req, res, (formData, files) => {
            try {
                // 处理表单数据，支持带连字符的字段名
                const movieName = formData['movie-name'] || formData.movieName;
                const posterUrl = formData['poster-url'] || formData.posterUrl || '';
                const videoUrl = formData['video-url'] || formData.videoUrl || '';
                const movieUrl = formData['movie-url'] || formData.movieUrl || '';
                const coverFile = files['cover-image'] || files.coverImage;
                const videoFile = files['video-file'] || files.videoFile;
                
                if (!movieName) {
                    sendJsonResponse(res, 400, { success: false, error: '缺少必要字段：电影名称' });
                    return;
                }
                
                // 确保至少提供了封面图片文件或封面图片链接
                if (!posterUrl && !coverFile) {
                    sendJsonResponse(res, 400, { success: false, error: '缺少必要字段：请提供封面图片文件或封面图片链接' });
                    return;
                }
                
                let poster;
                
                // 处理封面图片
                if (posterUrl) {
                    // 使用提供的封面图片链接
                    poster = posterUrl;
                } else {
                    // 保存封面图片文件到根目录
                    const sanitizedMovieName = movieName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
                    const coverExt = path.extname(coverFile.filename);
                    const coverPath = path.join(__dirname, `${sanitizedMovieName}${coverExt}`);
                    fs.writeFileSync(coverPath, coverFile.content);
                    poster = `${sanitizedMovieName}${coverExt}`;
                }
                
                // 更新电影列表
                const movies = readMovies();
                const newMovie = {
                    id: Date.now(),
                    title: movieName,
                    poster: poster,
                    cardKey: formData.cardKey || '',
                    movieUrl: movieUrl || '',
                    linkPassword: '' // 链接密码不再使用，设置为空
                };
                movies.push(newMovie);
                writeMovies(movies);
                updateIndexHtmlMovies(movies);
                
                // 保存卡密到文本文件和cards.json
                if (formData.cardKey) {
                    // 保存到文本文件
                    const cardKeyFilePath = path.join(__dirname, 'card_keys.txt');
                    const cardKeyData = `${formData.cardKey}|${newMovie.id}|${newMovie.title}|${new Date().toISOString()}\n`;
                    fs.appendFileSync(cardKeyFilePath, cardKeyData, { encoding: 'utf8', mode: 0o600 });
                    
                    // 保存到cards.json
                    try {
                        const cardsPath = path.join(__dirname, 'cards.json');
                        const cardsData = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
                        if (!cardsData.validCards.includes(formData.cardKey)) {
                            cardsData.validCards.push(formData.cardKey);
                            fs.writeFileSync(cardsPath, JSON.stringify(cardsData, null, 2), 'utf8');
                        }
                    } catch (error) {
                        console.error('更新cards.json失败:', error);
                    }
                }
                
                sendJsonResponse(res, 200, { success: true, message: '电影添加成功', movie: newMovie });
            } catch (error) {
                sendJsonResponse(res, 500, { success: false, error: error.message });
            }
        });
        return;
    } else if (pathname.match(/\/api\/movies\/(\d+)/) && req.method === 'PUT') {
        // 修改电影卡密或链接密码
        const movieId = parseInt(pathname.match(/\/api\/movies\/(\d+)/)[1]);
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const movies = readMovies();
                const movieIndex = movies.findIndex(movie => movie.id === movieId);
                
                if (movieIndex === -1) {
                    sendJsonResponse(res, 404, { success: false, error: '电影不存在' });
                    return;
                }
                
                // 更新电影信息
                const movie = movies[movieIndex];
                const oldCardKey = movie.cardKey;
                
                if (data.cardKey !== undefined) {
                    movie.cardKey = data.cardKey;
                }
                if (data.movieUrl !== undefined) {
                    movie.movieUrl = data.movieUrl;
                }
                if (data.linkPassword !== undefined) {
                    movie.linkPassword = data.linkPassword;
                }
                
                writeMovies(movies);
                updateIndexHtmlMovies(movies);
                
                // 更新cards.json中的卡密
                if (data.cardKey !== undefined && data.cardKey !== oldCardKey) {
                    try {
                        const cardsPath = path.join(__dirname, 'cards.json');
                        const cardsData = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
                        
                        // 如果有旧卡密，从cards.json中移除
                        if (oldCardKey && cardsData.validCards.includes(oldCardKey)) {
                            cardsData.validCards = cardsData.validCards.filter(card => card !== oldCardKey);
                        }
                        
                        // 如果有新卡密，添加到cards.json中
                        if (data.cardKey && !cardsData.validCards.includes(data.cardKey)) {
                            cardsData.validCards.push(data.cardKey);
                        }
                        
                        fs.writeFileSync(cardsPath, JSON.stringify(cardsData, null, 2), 'utf8');
                    } catch (error) {
                        console.error('更新cards.json失败:', error);
                    }
                }
                
                sendJsonResponse(res, 200, { success: true, message: '电影信息更新成功', movie: movie });
            } catch (error) {
                sendJsonResponse(res, 500, { success: false, error: error.message });
            }
        });
        return;
    } else if (pathname.match(/\/api\/movies\/(\d+)/) && req.method === 'DELETE') {
        // 删除电影
        const movieId = parseInt(pathname.match(/\/api\/movies\/(\d+)/)[1]);
        const movies = readMovies();
        const movieIndex = movies.findIndex(movie => movie.id === movieId);
        
        if (movieIndex === -1) {
            sendJsonResponse(res, 404, { success: false, error: '电影不存在' });
            return;
        }
        
        const movie = movies[movieIndex];
        
        // 删除文件
        try {
            fs.unlinkSync(path.join(__dirname, movie.poster));
        } catch (error) {
            console.warn('删除封面图片失败:', error);
        }
        
        // 更新电影列表
        movies.splice(movieIndex, 1);
        writeMovies(movies);
        updateIndexHtmlMovies(movies);
        
        sendJsonResponse(res, 200, { success: true, message: '电影删除成功' });
        return;
    } else {
        // 404
        sendJsonResponse(res, 404, { error: 'Not Found' });
    }
});

// 生成卡密
generateCardKeys();

// 启动服务器
server.listen(PORT, () => {
    console.log(`电影管理后台服务器运行在 http://localhost:${PORT}`);
    console.log(`访问前台页面: http://localhost:${PORT}`);
    console.log(`访问后台页面: http://localhost:${PORT}/admin`);
});