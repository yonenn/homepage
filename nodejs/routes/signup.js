var express = require('express');
var router = express.Router();
var fs = require('fs');
var sqlite3 = require("sqlite3").verbose();
var async = require('async');

/**
 *  サインアップ画面の表示
 *  http://localhost:3000/signup
 */
router.get('/',function(req, res){
    var html = (function() {/*

        <form action='/signup' method='post' id="form1">
            <fieldset>
                :message
                <p>NAME <input type="text" name="name" required><p>
                <p>PASSWORD <input type="password" name="pass" required></p>
                <input type="hidden" name="redirect" id="rd">
                <button type="submit" class="btn btn-primary" id="signup">sign up</button>
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
    if(req.query.err_name){
        html = html.replace(':message','<p>エラー：ユーザ名が既に登録されています</p><br>');
    }else{
        html = html.replace(':message','');
    }  
    res.render('contents_temp.ejs',{
        title: 'ユーザー登録画面',
        meta : null,
        main: html,
        loginStatus : null
    });


});

/**
 *  Postを受けてユーザ情報をデータベースに登録
 *  http://localhost:3000/signup
 */
router.post('/',function(req, res){

    // リクエストを取得
    var name = req.body.name;
    var pass = req.body.pass;
    var url = req.body.redirect;
    // データベースオープン
    var db = new sqlite3.Database("./public/sqlite/sourcedata.sqlite");

    //TODO 入力チェック

    // sql文実行
    db.serialize(function(){
        var sql = `INSERT INTO user(name, pass) VALUES("${name}","${pass}")`;
        db.run(sql,function(err){
            if(err){
                console.log(err);

                // エラーの時はもう一度登録画面を返す
                res.redirect(`/signup?redirect=${url}&err_name=true`);
            }else{
                db.close();

                // TODO 登録が完了しました画面に遷移する
                //res.redirect(`http://localhost:3000/signup/success?redirect=${url}`);

                // セッション登録
                req.session.loginStatus = true;
                req.session.loginData = {
                    name : name,
                    pass: pass,
                    icon : 'user.jpg'
                }
                // リダイレクト
                res.redirect(url);
            }

        })
    })
})

/**
 * TODO
 * 登録完了画面の表示
 * http://localhost:3000/signup/success
 */
router.get('/success',function(req, res){
    req.query.redirect
})
module.exports = router;