const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const babel = require('@babel/core');

// 入口分析函数
const entry = (filename) => { // filename:入口文件地址
  // console.log(filename);
  const content = fs.readFileSync(filename, 'utf-8');
  const Ast = parser.parse(content, {
    sourceType: 'module'
  })

  const yilai = {}; // 依赖
  traverse(Ast, {
    ImportDeclaration({ node }) {
      // console.log(node,'==node');
      // console.log(path.dirname(filename));
      const dirname = path.dirname(filename);
      const fileurl = node.source.value;
      const newfile = './' + path.join(dirname, fileurl);
      // console.log(newfile);
      yilai[fileurl] = newfile;
    }
  });
  // console.log(yilai);

  const { code } = babel.transformFromAst(Ast, null, {
    presets: ['@babel/preset-env']
  })
  // console.log(code,'==code');

  // return Ast.program.body;
  return {
    filename,
    yilai,
    code,
  }
}

// const info = entry('./src/index.js');
// console.log(info);

// 深层依赖分析函数
const deepModule = (filename) => {
  const entryInfo = entry(filename);
  // console.log(entryInfo);
  const deepMoudleArry = [entryInfo];
  for (let i = 0; i < deepMoudleArry.length; i++) {
    const item = deepMoudleArry[i];
    const { yilai } = item;
    if (yilai) {
      for (let j in yilai) {
        deepMoudleArry.push(entry(yilai[j]));
      }
    }
  }
  // console.log(deepMoudleArry,'==deepMoudleArry');
  const graph = {};
  deepMoudleArry.forEach((item) => {
    graph[item.filename] = {
      yilai: item.yilai,
      code: item.code
    }
  })
  return graph;
  // console.log(graph);
}
// deepModule('./src/index.js');

// 生成目标代码
const code = (filename) => {
  const yilaiAll = JSON.stringify(deepModule(filename));
  return `
    (function(yilaiAll){
      function require(module){
        function localRequire(relativePath){
          return require(yilaiAll[module].yilai[relativePath])
        }
        var exports = {};
        (function(require, exports, code){
          eval(code)
        })(localRequire, exports, yilaiAll[module].code)
        return exports;
      }
      require('${filename}')
    })(${yilaiAll})
  `;
}
const info = code('./src/index.js');
console.log(info);


// 1、首先分析入口文件
// 2、以分析入口文件为切入点，分析所有模块，同时，还要把语法转换成浏览器可识别的
// 3、生成代码（用闭包的方法，这样才能隔离作用域）