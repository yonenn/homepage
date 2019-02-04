var express = require('express');
var router = express.Router();
var sqlite3 = require("sqlite3").verbose();
var fs = require('fs');
var async = require('async');
var myfunc = require('../myfunc');

/**
 *  記事の投稿画面を表示する
 *  http://localhost:3000/article
 */
router.get('/', function(req, res){
  // ログインチェック
  if(!req.session.loginStatus){
    res.redirect(`/login?redirect=/article`);
    return;
  }
  res.render('profile.ejs',{
    title: '記事を投稿',
    main: '',
    loginStatus: myfunc.login_html(req.session)
  })
})

/**
 *  記事の情報をjson形式で返すAPI
 *  url: http://localhost:3000/article/return
 **/
router.post('/return', function(req, res, next){

  // レスポンスヘッダーの設定
  res.header('Content-Type', 'application/json; charset=utf-8');

  // データベースオープン
  var db = new sqlite3.Database("./public/sqlite/sourcedata.sqlite");
  // リクエストを取得
  var num = req.body.num;
  var filter = req.body.filter;
  var word = req.body.word;
  var searchtype = req.body.searchtype;
  var colname = 'time';

  // リクエストの種類によって処理を分岐
  if(searchtype == 0){
    word = `(SELECT id FROM article WHERE title LIKE "%${word}%")`;
  }else{
    word = `(SELECT id FROM tag_view Where tagname="${word}")`;
  }
  if(filter == "new"){
      filter = "ASC";
  }else if(filter == "old"){
      filter = "DESC";
  }else{
      colname = "title";
      filter = "DESC";
  }  
  
  // sql文を置き換え
  var sql = `SELECT id, title, time, group_concat(tagname) AS "tagname" FROM article_tag_view WHERE id IN ${word} GROUP BY id ORDER BY ${colname} ${filter} LIMIT ${num} , 20`;
  
  // 同期処理をする
  db.serialize(function(){
    // SQL文を実行
    db.all( sql , function(err, row){
      if(err){
        console.log(err)
      }
      // データベースクローズ
      db.close();
      // レスポンスを送る
      res.send(row);
    })
  })
})


/**
 * 新しい記事の登録処理をする
 * url: http://localhost:3000/article/post
 */
router.post('/post',function(req, res, next){

  // リクエストを取得
  var sourcecode = req.body.sourcecode;
  var title = req.body.title;
  var tag = req.body.tag;
  // データベースオープン
  var db = new sqlite3.Database("./public/sqlite/sourcedata.sqlite");
  // ランダムな10文字の英数字
  var strRandom = '';
  var meta;

  // タグを空白で分割する
  tag = tag.split(/\s+/);
  // 配列の重複を排除する
  tag = tag.filter(function(value, index, array){
    return array.indexOf(value) === index;
  });
  // 空要素を削除
  tag = tag.filter(function(value){
    return value != '';
  })

  // 一部を同期処理にする
  async.series([
    // 非同期処理(1)
    // ランダムな10桁の英数字を生成する
    function(next){

      // 非同期処理を同期的にループする
      var status = true;
      async.whilst(
        // ループ条件
        function(){
          if(!status){
            // idとtitleをsourcedataテーブルに登録
            db.run(`INSERT INTO article(id, title) VALUES("${strRandom}","${title}")`);
            next();
          }
          return status;
        },
        // 非同期処理
        function(callback){
          var str = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPUQRSTUVWXYZ';
          var strlen  = str.length;
          // 生成する文字列の長さ
          const strRandomlen = 10; 
          for(let i=0; i< strRandomlen; i++){
            strRandom += str[Math.floor(Math.random()*strlen)];
          }
          // -- ID被りしていないか確認 --
          // (注意)テンプレートリテラルを使うときはバッククオートを使う必要がある
          var sql = `SELECT COUNT(*) AS "count" FROM article WHERE id = "${strRandom }"`;
          // dbを同期処理
          db.serialize(function(){
            // SQL文を実行
            db.get(sql, function(err, row){
              if(err){
                console.error('ERROR!!!', err);
                return;
              }
              // id被りが無かったらループを抜ける
              if(row.count == 0){
                status = false;
              }
              callback();
            });
          });
        }
      );
    },
    // 非同期処理(2)
    // タグの登録処理
    function(next){
      // foreachの同期処理version
      async.each(tag,function(i,callback){
        // 同期処理
        db.serialize(function(){

          async.series([
            function(next){
              // 登録済みのタグか確認
              sql = `SELECT COUNT(*) AS "count" FROM tag WHERE tagname = "${i}"`;
              db.get(sql, function(err, row){
                if(err){
                  console.error('ERROR', err);
                  return;
                }
                // 新規タグならデータベース(tagdataテーブル)に登録
                if(row.count == 0){
                  db.run(`INSERT INTO tag(tagname) VALUES("${i}")`,(err)=>{
                    if(err){
                      console.log(err);
                      return;
                    }
                    next();
                  })
                }else{
                  next();
                }
              })
            },
            function(next){
                // tagdataテーブルからtagIDを取得
                sql = `SELECT tagID FROM tag WHERE tagname="${i}"`;
                db.get(sql, function(err, row){
                  if(err){
                    console.error('ERROR', err);
                    return;
                  }
                  // tagテーブルにidとタグIDを登録
                  db.run(`INSERT INTO tag_article VALUES("${strRandom}","${row.tagID}")`);
                  callback();
                })
            }
          ])
        })
      },function(err){
        if(err){
          console.log(err);
        }
        next();
      });
    },
    //非同期処理(3)
    // ファイル生成など
    function(next){

      // ファイル作成
      fs.writeFile(`./public/sourcecode/${strRandom}.md`,sourcecode,function(err){return});
      // データベースクローズ
      db.close();
      // リダイレクト
      res.redirect('http://localhost:3000');
      next();
    }
  ])
})



module.exports = router;