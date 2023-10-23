var express = require('express');
var router = express.Router();
var fs = require('fs');
var sqlite3 = require("sqlite3").verbose();
var async = require('async');

/**
 *  ログイン画面の表示
 *  http://localhost:3000/login
 */
router.get('/',function(req, res){
    var html = (function() {/*

        <form action='/login' method='post' name="form" id="form1">
            <fieldset>
                :message
                <p>NAME <input type="text" name="name" required><p>
                <p>PASSWORD <input type="password" name="pass" required></p>
                <input type="hidden" name="redirect" id="rd">
                <button class="btn btn-primary" id="login">login</button>
            </fieldset>
        </form>
        
        <script src="//code.jquery.com/jquery-3.3.1.min.js"></script>
        <script>
            $('#rd').attr('value',getParam('redirect'));

            function getParam(name, url) {
                if (!url) url = window.location.href;
                name = name.replace(/[\[\]]/g, "\\$&");
                var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
                    results = regex.exec(url);
                if (!results) return null;
                if (!results[2]) return '';
                return decodeURIComponent(results[2].replace(/\+/g, " "));
            }
        </script>



    */}).toString().match(/\/\*([^]*)\*\//)[1];

    // エラーメッセージ処理
    if(req.query.err){
        html = html.replace(':message','<p>エラー： ログインできません <p><br>');
    }else{
        html = html.replace(':message', '');
    }
    res.render('contents_temp.ejs',{
        title: 'ログイン画面',
        meta : null,
        main: html,
        loginStatus : null
    });

});

/**
 *  ポストを受けてログイン処理
 *  http://localhost:3000/login
 */
router.post('/',function(req, res){
    // ポストリクエストを取得
    var name = req.body.name;
    var pass = req.body.pass;

    // データベースオープン
    var db = new sqlite3.Database("./public/sqlite/sourcedata.sqlite");

    db.serialize(function(){
        var sql = `select name, pass, icon from user where name = "${name}"`;
        db.get(sql,function(err,data){
            if(err || data == undefined){
                console.log(err);
                db.close();
                // TODO エラーならログイン画面に戻ってエラーメッセージを表示
                res.redirect(`/login?redirect=${req.body.redirect}&err=true`);
            }else
            // パスワードが一致しているかを確認
            if(data.pass != pass){
                
                console.log(err);
                db.close();
                // TODO エラーならログイン画面へ
                res.redirect(`/login?redirect=${req.body.redirect}&err=true`);         
            }else{
                // ログイン成功時
                // セッションの登録
                req.session.loginStatus = true;
                req.session.loginData = {
                    name: name,
                    pass: pass,
                    icon: data.icon
                }
                db.close();
                // リダイレクト
                res.redirect(req.body.redirect);
            }
        })
    })
    
});

module.exports = router;