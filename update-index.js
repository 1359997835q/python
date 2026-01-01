// 更新index.html中的电影数据
const fs = require('fs');
const path = require('path');

// 读取电影数据
function readMovies() {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'movies.json'), 'utf8'));
    } catch (error) {
        console.error('读取movies.json失败:', error);
        return [];
    }
}

// 更新index.html中的电影数据
function updateIndexHtmlMovies(movies) {
    try {
        // 读取index.html文件
        let indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
        
        // 生成新的电影数据字符串
        const moviesJson = JSON.stringify(movies, null, 4);
        
        // 替换index.html中的电影数据
        const updatedHtml = indexHtml.replace(
            /\/\/ 电影数据\n        const movies = \[[\s\S]*?\];/, 
            `// 电影数据
        const movies = ${moviesJson};
        `
        );
        
        // 保存更新后的index.html
        fs.writeFileSync(path.join(__dirname, 'index.html'), updatedHtml, 'utf8');
        console.log('index.html中的电影数据已更新');
    } catch (error) {
        console.error('更新index.html失败:', error);
    }
}

// 执行更新
const movies = readMovies();
updateIndexHtmlMovies(movies);
