$(function () {
    App.init();
});

var App = {
    domains: {
        "item.taobao.com": 'parseTaobao',
        "detail.tmall.com": 'parseTmall'
    },
    //页面解方法
    pageParser: null,
    //页面内容
    pageSource: null,
    //解析结果
    payload:{}
};
//初始化扩展
App.init = function () {

    chrome.tabs.getSelected(null, function (tab) {
        var href = tab.url;
        var flag = false;
        var st = $('#status');
        var box = $('#parseBox');
        var s_alert = chrome.i18n.getMessage('statusAlert');
        var s_info = chrome.i18n.getMessage('statusInfo');
        for (var key in App.domains) {
            if (href.indexOf(key) >= 0) {
                flag = true;
                App.pageParser = App.domains[key];
                break
            }
        }
        if (flag) {
            st.text(s_info);
            st.removeClass('alert').addClass('info');
            box.show();
            App.initEvent();
            App.insertScript();
        } else {
            st.text(s_alert);
            st.removeClass('info').addClass('alert');
            box.hide();
        }
    });
};

//初始化事件
App.initEvent = function () {
    chrome.runtime.onMessage.addListener(function (request, sender) {
        if (request.action === 'getSource') {
            App.pageSource = request.source;
            App.parsePageSource();
        }
    });
};

//向页面插入脚本
App.insertScript = function () {
    chrome.tabs.executeScript(null, {
        file: "getPagesSource.js"
    }, function () {
        if (chrome.runtime.lastError) {
            var msg = chrome.runtime.lastError.message;
            console.log(msg);
            var st = $('#status');
            st.text(msg);
            st.removeClass('info').addClass('alert');
            $('#parseBox').hide();
        }
    });
};
//解析页面内容弄个啦
App.parsePageSource = function () {
    //console.log(App.pageSource);
    //var dom =  $(App.pageSource);//$('<div/>').html(App.pageSource).children().first();
    var parser = new DOMParser();
    var dom = parser.parseFromString(App.pageSource, "text/html");

    var parserFun = App[App.pageParser];
    if( parserFun && dom){
        parserFun(dom);
    }
};
//解析taobao.com
App.parseTaobao = function (dom) {
    App.parseAli('taobao',dom);
};
//解析tmall.com
App.parseTmall = function (dom) {
    App.parseAli('tmall',dom);
};
//解析阿里巴巴旗下的商品数据
App.parseAli = function(type,dom){
    var title = type == 'taobao' ? $('.tb-main-title',dom).text() :
                    type == 'tmall' ? $('#J_DetailMeta h1',dom).text() : '';

    var titleSub = type == 'taobao' ? $('.tb-subtitle',dom).text() :
                        type == 'tmall' ? $('.newp',dom).text() : '';

    var priceE = type == 'tabao' ?  $('.tb-rmb-num',dom) :
                    type == 'tmall' ? $('.tm-price',dom) : null;

    //价格
    var price = priceE ? priceE.last().text() : 0;
    //原价
    var priceOrigin = priceE ? priceE.first().text() : 0;

    // 评价数量，销量
    var rateCounter = 0, sellCounter = 0;

    if(type == 'taobao'){
        rateCounter = $('#J_RateCounter',dom).text();
        sellCounter =  $('#J_SellCounter',dom).text();
    }else if(type == 'tmall'){
        var counts = $('.tm-count',dom);
        sellCounter = counts.first().text();
        rateCounter = counts.eq(1).text();
    }

    var content = $('.content',dom).html();

    var images = [];
    var attributes = [];

    //images
    $('#J_UlThumb',dom).find('li').each(function(){
        var img = $(this).find('img').first();
        if(img) {
            var src = img.attr('src');
            src = "https:" + src.substr(0, src.indexOf('.jpg_') + 5) + "400x400.jpg_.webp";
            images.push(src);
        }
    });
    //attributes
    $('.attributes-list',dom).find('li').each(function(){
        attributes.push($(this).text());
    });



    App.payload['title'] = $.trim(title);
    App.payload['titleSub'] = $.trim(titleSub);
    App.payload['price'] = parseFloat($.trim(price));
    App.payload['priceOrigin'] = parseFloat($.trim(priceOrigin));
    App.payload['rateCounter'] = parseFloat($.trim(rateCounter));
    App.payload['sellCounter'] = parseFloat( $.trim(sellCounter));
    App.payload['content'] = $.trim(content);
    App.payload['images'] = images;
    App.payload['attributes'] = attributes;

    App.showParseRs();
};

//显示解析结果
App.showParseRs = function(){
    console.log( App.payload);
    var rsBox = $('#parseRs');
    var rs = $('#rs');
    rs.text(JSON.stringify(App.payload));
    rsBox.show();
};