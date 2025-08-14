// ==UserScript==
// @name         兑换助手
// @namespace    http://tampermonkey.net/
// @version      2.0.0.5
// @description  简陋的兑换助手，废弃了第一版的多数方法，对页面本身的元素操作减少
// @author       唐僧肉片
// @match        https://wsddj.quxianghudong.com/act/*
// @icon         https://cdn-game-forum-wsddj.quxianghudong.com/public/favicon_6d33aace3f3d61c944d16b33f6d1ee37.png
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      activity-gateway.23you.net
// @connect      example.com
// ==/UserScript==

(function() {
    'use strict';
    // 自定义样式，覆盖原页面一些冲突的设计
    GM_addStyle(`
        #tm-selector {
            display: inline-block !important;
            opacity: 1 !important;
            visibility: visible !important;
            /* 基础样式 */
            padding: 4px 8px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            font-size: 14px;
        }
        #user_logs_content>p{
            padding: 10px 0px;
        }
    `);
    //console.log("Hello DDJ");
    const myHeaders = {"Content-Type": "application/json"};
    const baseInterval = 8, maxJitter = 60000; //默认是要间隔8分钟左右向服务器请求一下库存，页面内可以自行调整
    //const baseUrl = "http://example.com/"; //这个网址是自己的涉及需要推送提醒的接口
    const ddjUrl = "https://activity-gateway.23you.net/";
    const storage_key = "storage"; //使用GM_getValue来存储库存记录的键值
    const userinfo_key = "userinfo";
    let user_timer;
    //GM_deleteValue(userinfo_key);
    //GM_deleteValue(storage_key);
    mainFunc();
    //alertPushPlus("四周年礼盒的库存为20", "2025/8/12 16:44:26四周年礼盒的库存为20，如有需要请及时兑换！");
    /***
    主程序入口，等待页面加载完成，完成后再执行页面初始化操作
    ***/
    function mainFunc(){
        const checkInterval = setInterval(function() {
            const buttons = document.querySelectorAll('.adm-capsule-tabs-tab'); //这是找到“每周”和“每月”两个按钮，当两个按钮都存在的时候，代表页面已经加载完毕
            if (buttons.length >= 2) {
                console.log("---------------页面加载完成-----------------");
                clearInterval(checkInterval); // 停止轮询
                //alertPushPlus();
                //scheduleCheckRemain(true, false);
                initLayerHtml(); //初始化页面元素
            }
        }, 500);
    }
    /***
    这是借用页面本身的样式，弹出的友好提示界面，默认显示2秒后自动关闭
    即使不关闭，应该也不影响操作其他元素
    ***/
    function showToast(message, duration = 2000) {
        // 创建 Toast HTML 结构
        const toastHTML = `<div class="adm-mask adm-toast-mask" aria-hidden="true" style="pointer-events: none; background: rgba(0, 0, 0, 0); opacity: 1;"><div class="adm-mask-content"><div class="adm-toast-wrap"><div class="adm-toast-main adm-toast-main-text" style="top: 50%;"><div class="adm-auto-center"><div class="adm-auto-center-content">${message}</div></div></div></div></div></div>`;

        // 创建容器并插入到 body 末尾
        const container = document.createElement('div');
        container.innerHTML = toastHTML;
        document.body.appendChild(container);

        // 1秒后自动移除
        setTimeout(() => {
            container.remove();
        }, duration);
    }
    /***
    为了方便操作，在页面增加一些元素，并为元素绑定一些事件
    ***/
    function initLayerHtml(){
        //layerHTML是用于填充默认收货地址的弹出层，页面内的输入框都不检查有效性，所以自行认真填写。
        const layerHTML = `<div id="user_layer_html" style="display: none;">
  <div>
    <div class="adm-center-popup adm-modal activity-modal">
      <div class="adm-mask adm-center-popup-mask" aria-hidden="true" style="background: rgba(0, 0, 0, 0.55); opacity: 1;">
        <div class="adm-mask-aria-button" role="button" aria-label="背景蒙层"></div>
        <div class="adm-mask-content"></div>
      </div>
      <div class="adm-center-popup-wrap">
        <div style="opacity: 1; pointer-events: unset; transform: none;">
          <div class="adm-center-popup-body adm-modal-body">
            <div class="adm-modal-title">
              <div class="two-col-wrapper">
                <div>地址信息</div>
              </div>
            </div>
            <div class="adm-modal-content">
              <div style="margin-bottom: 12px;">
                <span class="text-blue text-bold">收件地址：</span>
                <input type="text" id="user_address" name="user_address" placeholder="直接输入完整的收件地址" style="width: 70%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
              </div>
              <div style="margin-bottom: 12px;">
                <span class="text-blue text-bold">收件姓名：</span>
                <input type="text" id="user_reciever" name="user_reciever" placeholder="请输入收件人姓名" style="width: 70%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
              </div>
              <div style="margin-bottom: 12px;">
                <span class="text-blue text-bold">联系电话：</span>
                <input type="tel" id="user_phone" name="user_phone" placeholder="请输入11位手机号" style="width: 70%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
              </div>
              <div style="margin-bottom: 12px;"><span class="text-gray">本页面不验证任何信息，所以请自行确认填写的地址真实有效。</span></div>
            </div>
            <div class="adm-space adm-space-block adm-space-vertical adm-modal-footer">
              <div class="adm-space-item">
                <button type="button" class="adm-button adm-button-primary adm-button-block adm-button-fill-none adm-button-shape-default adm-modal-button" id="close_user_layer_button">
                  <span>关闭</span>
                </button>
              </div>
              <div class="adm-space-item">
                <button type="button" class="adm-button adm-button-primary adm-button-block adm-button-large adm-button-shape-default adm-modal-button adm-modal-button-primary" id="confirm_user_layer_button">
                  <span>确认地址</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;
        //fixed_html是页面底部的一些元素，没有别的显眼的地方可以放，所以只能固定在页面底部
        const fixed_html = `<div style="background: rgba(0, 0, 0, 0.55); opacity: 1; position: fixed; width: 100%; bottom: 0.12rem; padding: 10px; z-index: 99; color: white;">
        <div><span id="user_address_text">暂无地址，如果需要借用程序实现自动兑换，请先点击此处添加。</span></div>
        <div><button type="button" id="show_logs_button" class="adm-button adm-button-warning adm-button-mini adm-button-shape-default"><span>库存记录</span></button>
        <input type="tel" id="user_minutes" name="user_minutes" style="width: 20%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; text-align: right; background: white; color: black;">分钟间隔
        <button type="button" id="save_user_minutes" class="adm-button adm-button-warning adm-button-mini adm-button-shape-default"><span>保存执行</span></button></div>
        <div><select id="user_selector" style="padding: 4px 8px;border-radius: 4px;border: 1px solid rgb(217, 217, 217); color: black;"></select>
        <button type="button" id="confirm_order" class="adm-button adm-button-warning adm-button-mini adm-button-shape-default"><span>确认兑换</span></button></div></div>`;
        //这个是用来显示库存记录的弹出层
        const logs_html = `<div id="user_logs_html" class="SrF7b6nIcnM9h_mdTqk7 fade-enter-done" style="display: none;"><div class="DbNJu9P1ckU7w0prd_ur"></div><div class="HDjQp52nB4ZvQUol67ua I_Tnd8cKLl1jPrLtMTIv"><h4>库存记录(最近10条)</h4><div id="user_logs_content" class="Pdqgj4DVjRs0Ym3A23B1"></div><div id="user_logs_button" class="lSLPSg4Kc0Njo4NntXPn">我知道了</div></div></div>`
        // 创建容器并插入到 body 末尾
        const layer_container = document.createElement('div');
        layer_container.innerHTML = layerHTML;
        document.body.appendChild(layer_container);
        const fixed_container = document.createElement('div');
        fixed_container.innerHTML = fixed_html;
        document.body.appendChild(fixed_container);
        const logs_container = document.createElement('div');
        logs_container.innerHTML = logs_html;
        document.body.appendChild(logs_container);
        const user_info = GM_getValue(userinfo_key, {});
        //为地址填写界面的关闭按钮绑定隐藏弹出层的事件，其实这个按钮，可以删除。
        document.getElementById("close_user_layer_button").addEventListener('click', () => {
            document.getElementById("user_layer_html").style.display = "none";
        });
        //为地址填写界面的确认按钮绑定事件，把填写的地址存入本地存储
        document.getElementById('confirm_user_layer_button').addEventListener('click', () => {
            const address = document.getElementById('user_address').value;
            const reciever = document.getElementById('user_reciever').value;
            const phone = document.getElementById('user_phone').value;
            //console.log({ address, reciever, phone });
            // 暂无验证数据的逻辑
            saveAddressInfo(address,reciever,phone);
            document.getElementById("user_layer_html").style.display = "none";
        });
        //如果本地存储没有地址信息，那么自动弹出地址填写界面
        if(user_info.address == undefined){
            document.getElementById("user_layer_html").style.display = "";
        }else{
            getStorageAddressInfo(); //把本地存储的地址信息读入
        }
        //以下是固定在底部的容器内的一些事件的绑定操作
        updateSelector(); //页面加载后，执行商品下拉框的选项更新操作
        document.getElementById("user_address_text").addEventListener('click', () => {
            document.getElementById("user_layer_html").style.display = ""; //为底部地址显示区域，绑定点击事件，弹出地址填写界面，用于更新地址信息。用这个事件，可以减少一个按钮来更新地址的操作。
        });
        document.getElementById("show_logs_button").addEventListener('click', () => {
            getLogsFromLocal(storage_key, document.getElementById("user_logs_content")); //读取本地存储的库存记录信息，然后弹出显示
            document.getElementById("user_logs_html").style.display = "";
        });
        document.getElementById("save_user_minutes").addEventListener('click', () => {
            saveUserMinutes(parseInt(document.getElementById("user_minutes").value)); //把时间间隔界面填写的数字保存，保存会验证数字的合理性。
        });
        document.getElementById("confirm_order").addEventListener('click', () => {
            const selector = document.getElementById("user_selector");
            confirmOrder(parseInt(selector.value)); //绑定提交订单的事件。
        });
        document.getElementById("user_logs_button").addEventListener('click', () => {
            document.getElementById("user_logs_html").style.display = "none"; //库存记录显示界面，最下边的按钮，用来关闭库存记录的显示。
        });
        if(user_info.time != undefined) saveUserMinutes(user_info.time);
    }
    /***
    这个方法用来更新商品下拉框的数据信息
    而且根据商品是否有库存，如果有的话，自动选中那个有库存的选项
    但是只能选中第一个有库存的选项，如果不合适的话，需要手动更改操作
    我用本地存储的两个key来存储数据：一个是userinfo，用来存储地址信息，库存获取频率，和有库存的商品信息；
    另一个是storage，专门用来存储10条最近的获取记录
    强制更新，就是把userinfo中的商品信息，从storage处更新一下
    userinfo只存储有库存的商品
    ***/
    function updateSelector(){
        const user_info = GM_getValue(userinfo_key, {});
        let selector_html, selected = false;
        const latest = user_info.options;
        if(latest == undefined || latest.length == 0){
            scheduleCheckRemain(true, false);
            return;
        }
        for(const item of latest){
            selector_html += `<option value="${item.id}"`;
            if(item.remainCount > 0 && !selected){
                selector_html += ` selected`;
                selected = true;
            }
            selector_html += `>${item.rewardName}(剩余${item.remainCount})</option>`;
        }
        document.getElementById("user_selector").innerHTML = selector_html;
    }
    /***
    这个方法用来设置库存获取的频率，如果设置为-1,那么程序暂停执行
    其他取值区间为0-10, 其余的时间一律会认为不合适，被重置为系统默认的间隔
    设置为0的时候，一般是在月初1号，系统大概率会更新库存的时候
    其余时间不建议间隔时间过短
    默认是从userinfo里面存储的更新频率里面获取数据
    需要更新的时候，将新的参数传递过来就行了
    ***/
    function saveUserMinutes(m = null){
        let min = 0;
        const user_info = GM_getValue(userinfo_key, {});
        if(m == null){
            min = user_info.time;
            document.getElementById("user_minutes").value = min;
        }else{
            min = parseInt(m);
            if(isNaN(m) || min < -1 || min > 10){
                min = baseInterval;
                document.getElementById("user_minutes").value = min;
                showToast(`时间格式不正确，不能太长。已经调整为默认${baseInterval}分钟。`);
            }
            user_info.time = min;
            GM_setValue(userinfo_key, user_info);
        }
        if(min > -1){
            scheduleCheckRemain(false, true); //设置完成频率以后，调用方法进入获取库存的函数。
        }else{
            showToast("时间间隔设置为-1, 程序暂停执行");
        }
    }
    //获取userinfo里面存储的地址信息
    function getStorageAddressInfo(){
        const address = document.getElementById('user_address');
        const reciever = document.getElementById('user_reciever');
        const phone = document.getElementById('user_phone');
        const user_info = GM_getValue(userinfo_key, {});
        if(user_info){
            address.value = user_info.address;
            reciever.value = user_info.reciever;
            phone.value = user_info.phone;
            const address_html = `默认地址：${user_info.address},${user_info.reciever},${user_info.phone}`;
            document.getElementById("user_address_text").innerHTML = address_html;
            document.getElementById("user_minutes").value = user_info.time; //这里把时间间隔输入框的内容显示为userinfo存储的内容
        }
    }
    //这个是保存地址信息到userinfo本地存储，另外把事件间隔也初始化一下
    function saveAddressInfo(a, r, p){
        const user_info = GM_getValue(userinfo_key, {});
        user_info.address = a;
        user_info.reciever = r;
        user_info.phone = p;
        if(user_info.time == undefined) user_info.time = baseInterval;
        GM_setValue(userinfo_key, user_info);
        saveUserMinutes(user_info.time);
        getStorageAddressInfo();
    }
    /***
    这是库存记录格式化显示的方法
    第一个参数是storage_key，第二个参数是弹出层的数据填充位置
    ***/
    function getLogsFromLocal(key, container){
        const logs = GM_getValue(key, []);
        let logs_content = "";
        for(const log of logs){
            logs_content += `<p>${log.time}库存:`;
            for(const s of log.storage){
                logs_content += `${s.rewardName}:${s.remainCount};`;
            }
            logs_content += "</p>";
        }
        container.innerHTML = logs_content;
        document.getElementById("user_logs_html").style.display = "";
    }
    //复用这个方法，第一个参数，表示程序立刻执行，不用等待，也无须重复执行。默认是延时并重复执行。
    //第二个参数，表示需要停止之前的排期，重新开始计时执行。默认不重置计时器。
    function scheduleCheckRemain(start_now = false, restart = false){
        const url = ddjUrl + "api/act/process/group-list-reward";
        const data = JSON.stringify({"bizTypes":["point"],"needRemainCount":true,"needReceiveState":false,"needUserRewardedCount":true});
        if(start_now){
            postData(url, data, getRealItem);
            return;
        }
        const jitter = (Math.random() * 2 - 1) * maxJitter;
        const user_info = GM_getValue(userinfo_key, {});
        let userInterval = baseInterval;
        if(!isNaN(user_info.time)) userInterval = user_info.time;
        const nextInterval = Math.abs(userInterval * 60 * 1000 + jitter);
        const nextMin = nextInterval/60/1000;
        if(restart){
            clearTimeout(user_timer);
            console.log(`清除之前的计时器，重新开始计时。大约在${nextMin.toFixed(2)}分钟后执行`);
        }else{
            console.log(`大约在${nextMin.toFixed(2)}分钟后执行`);
        }
        user_timer = setTimeout(function(){postData(url, data, getRealItem, true);}, nextInterval);
    }
    /***
    这是向服务器发送post数据的通用方法，因为headers基本上都是需要这些的
    区别就是第一个参数是请求地址，第二个参数是携带的json格式数据
    第三个参数是回调函数，默认没有
    第四个参数是是否重复执行，默认不重复
    ***/
    function postData(url, data, func = null, repeat = false){
        const ddjHeaders = {
            "Content-Type": "application/json",
            "Origin": "https://wsddj.quxianghudong.com",
            "Referer": "https://wsddj.quxianghudong.com",
            "actToken": localStorage.getItem("forum_token_forum_points_actToken"),
            "clientInfo": JSON.stringify({"runEnv":"pc_web","clientId": localStorage.getItem('mid')}),
            "Accept": "application/json, text/plain, */*",
            "bizLine": "cn",
            "actCode": "wsddj-forum-point",
            "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": "Windows"
        }
        //console.log(ddjHeaders);
        GM_xmlhttpRequest({
            method: "POST",
            url: url,
            data: data,
            headers: ddjHeaders,
            onload: function (response) {
                var json = JSON.parse(response.responseText);
                console.log(new Date().toLocaleString() + json.msg);
                if(func) func(json);
                if(repeat) scheduleCheckRemain();
            },
            onerror: function(reponse) {
                console.log("error: ", reponse);
            }
        });
    }
    //这个方法把从服务器获取到的冗余数据，精简为自己需要的库存信息。最重要的是，如果有库存可以在这里设置提醒。
    function getRealItem(obj){
        const month = obj.data[1];
        let items = [];
        let options = [];
        const user_info = GM_getValue(userinfo_key, {});
        for(const re of month.rewards){
            let item = {};
            if(re.rewardType == "physical"){
                item.bizParam = re.bizParam;
                item.id = re.id;
                item.remainCount = re.remainCount;
                item.rewardName = re.rewardName;
                items.push(item);
                if(item.remainCount > 0) options.push(item);
                if(item.bizParam < 2001 && item.remainCount > 0){ //当兑换需要的积分在2000以下，而且库存大于0的时候，进入这里
                    const str = `${new Date().toLocaleString()}${item.rewardName}(${item.bizParam})的库存为${item.remainCount}，如有需要请及时兑换！`;
                    const title = `${item.rewardName}(${item.bizParam})的库存为${item.remainCount}`;
                    console.log(str);
                    //alertPush(title, str); //发送提醒，如果没有对应的接口，这里默认删除
                }
            }
        }
        user_info.options = options;
        GM_setValue(userinfo_key, user_info);
        updateSelector();
        saveLogs(storage_key, {"time": new Date().toLocaleString(), "storage": items});
        //console.log(GM_getValue(storage_key));
    }
    /***
    从名字就能看出来，这最开始是按照日志的逻辑来设计的
    但是此处专用于记录库存记录
    第一个参数是storage_key，是固定的
    第二个参数是传入的一条库存信息
    第三个参数是数量限制，默认是10条
    并且最终要按照插入顺序倒序显示，就跟队列一样，超过10条，最新记录会把最旧的记录顶出去
    ***/
    function saveLogs(key, new_value, limit = 10){
        const logs = GM_getValue(key, []);
        logs.unshift(new_value);
        if(logs.length > limit) logs.pop();
        GM_setValue(key, logs);
    }
    /***
    关于提醒，是没有很好的方法的，暂时使用的是Gotify的浏览器通知功能，既然程序是运行于电脑端，那么就在浏览器通知一下吧
    第一个参数是标题，第二个参数是内容
    ***/
    function alertPush(title, msg){
        const myURL = baseUrl + "public/wsddj_api.php";
        const myData = JSON.stringify({"do": "alert", "t": title, "s": msg});
        GM_xmlhttpRequest({
            method: "POST",
            url: myURL,
            data: myData,
            headers: myHeaders,
            onload: function (response) {
                //var json = JSON.parse(response.responseText);
                console.log(response.responseText);
            },
            onerror: function(reponse) {
                //alert('error');
                console.log("error: ", reponse);
            }
        });
    }
    //这是最终的提交函数，需要传入商品ID，地址从userinfo存储中读取，所以要事先设置。
    //这个提交订单没有二次确认，点击后就会直接发送给服务器，如果有库存，理论上来说就能直接完成兑换。
    function confirmOrder(id){
        const url = ddjUrl + "api/act/process/exchange-point-reward";
        const user_info = GM_getValue(userinfo_key);
        const recieveAddress = user_info.address;
        const recievePhone = user_info.phone;
        const recieveName = user_info.reciever;
        const data = JSON.stringify({"rewardId":id,"receiveName":recieveName,"receivePhone":recievePhone,"receiveAddress":recieveAddress});
        postData(url, data, function(json){
            showToast(json.msg);
        });
    }
})();
