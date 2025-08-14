// ==UserScript==
// @name         兑换助手
// @namespace    http://tampermonkey.net/
// @version      1.0.0.3
// @description  简陋的兑换助手，由于对页面元素过于依赖，所以已经废弃
// @author       唐僧肉片
// @match        https://wsddj.quxianghudong.com/act/*
// @icon         https://cdn-game-forum-wsddj.quxianghudong.com/public/favicon_6d33aace3f3d61c944d16b33f6d1ee37.png
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
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
    `);
    console.log("Hello DDJ");
    const stopOption = "暂停执行";
    const needToDo = GM_getValue('myoption', stopOption);
    var currentStep = GM_getValue('mystep', 1); //因为有三个不同的页面操作，所以需要控制当前的步骤
    //console.log(currentStep);
    const itemsList = [stopOption, "随机鼠标垫", "小宝抱枕", "小宝帆布袋", "四周年礼盒"];
    //const needItem = "小宝抱枕"; //选择需要兑换的物品
    switch(currentStep){
        case 1:
            firstStep();
            break;
        case 2:
            secondStep();
            break;
        case 3:
            thirdStep();
            break;
        default:
            console.log("当前无需执行");
    }
    /***
    这是第一步，等待页面加载完成后，切换到“每月”选项卡
    可能是最初设计的逻辑问题，应该和下面的那个函数交换顺序
    也没有太大影响，先这样吧
    ***/
    function firstStep(){
        const checkInterval = setInterval(function() {
            const buttons = document.querySelectorAll('.adm-capsule-tabs-tab'); //这是找到“每周”和“每月”两个按钮，当两个按钮都存在的时候，代表页面已经加载完毕
            //这里的逻辑有点儿问题，按说按钮出来之后，马上就要执行寻找指定兑换物品的元素，而这时兑换物品列表可能还没有完全加载，哪怕有1秒的延迟，都会报错
            if (buttons.length >= 2) {
                console.log("加载完成");
                buttons[1].click(); //模拟点击“每月”按钮
                addIfToDo();
                //这里执行我想要的操作
                if(needToDo != stopOption){
                    setTimeout(() => {
                        getTargetNodes(needToDo); //传递要兑换的物品参数到指定函数，延时300毫秒执行，等待所有兑换物品列表加载完成
                    }, 300);
                }
                clearInterval(checkInterval); // 停止轮询
            }
        }, 500);
    }
    /***
    在页面添加一个下拉选择框，下拉框来确定是否需要执行，以及需要兑换的物品
    ***/
    function addIfToDo() {
        //确定页面只存在一个下拉框
        if (document.getElementById('tm-selector')) {
            console.log('选择组件已存在，跳过添加');
            return;
        }

        var targetElement = document.querySelectorAll("button.adm-button-fill-outline")[1]; // 这是页面右上角的“兑换规则”按钮，我把下拉框放到这个按钮的附近
        if (!targetElement) return; // 确保目标元素存在

        // 创建外层容器 div
        const switchDiv = document.createElement('div');

        var selector = document.createElement('select');
        selector.id = 'tm-selector';
        selector.style.width = '100%'; // 宽度填满容器
        selector.style.padding = '4px 8px';
        selector.style.borderRadius = '4px';
        selector.style.border = '1px solid #d9d9d9';

        // 填充选项
        itemsList.forEach(function(text) {
            var option = document.createElement('option');
            option.value = text; // value 和 text 一致
            option.textContent = text;
            selector.appendChild(option);
        });

        // 默认选中第一个选项
        selector.value = GM_getValue('myoption', itemsList[0]);

        // 监听变化
        selector.addEventListener('change', function() {
            GM_setValue('myoption', selector.value);
            if(selector.value != stopOption){
                showToast(`当前选中：${selector.value}，请刷新页面自动执行`)
            }
            //console.log(`当前选定值：${selector.value}`);
        });

        // 将复选框和标签放入容器
        switchDiv.appendChild(selector);

        // 将容器插入到目标按钮后面
        targetElement.insertAdjacentElement('afterend', switchDiv);
    }
    /***
    根据传递过来的物品名称，在页面寻找对应的物品
    ***/
    function getTargetNodes(targetValue){
        var parent = document.querySelectorAll('.adm-capsule-tabs-content')[1].childNodes[0];
        var items = parent.children;
        //console.log(items);
        let isFound = false;
        // 遍历每个 item
        outerLoop: for (const item of Array.from(items)) {
            // 在当前 item 下查找所有的 <span class="ell pointer">（无论嵌套多深）
            const spans = item.querySelectorAll('span.ell.pointer');

            // 遍历并检查每个 span 的文本内容
            for (const span of spans) {
                const text = span.textContent.trim();
                //console.log('当前文本:', text); // 调试用

                if (text === targetValue) {
                    //console.log(`找到目标值 "${targetValue}"，退出循环`);
                    isFound = true;
                    clickTargetButton(span); //找到物品之后，将该元素传递到指定的函数
                    break outerLoop; // 退出外层循环
                }
            }
        }
        if(!isFound){
            showToast(`暂时还没有上架"${targetValue}"`)
            //console.log(`暂时还没有上架"${targetValue}"`);
        }
    }
    /***
    根据传递过来的物品名称，找到附近的兑换按钮，模拟点击
    但是有可能出现没有兑换按钮的情况，比如积分不足
    ***/
    function clickTargetButton(targetSpan){
        console.log(targetSpan);
        var buyButton = targetSpan.nextElementSibling;
        console.log(buyButton);
        if(buyButton.textContent.trim() == "积分不足") {
            showToast("积分不足，无法兑换");
            //console.log("积分不足，无法兑换");
            return;
        }
        buyButton.click();
        const checkPopReady = setInterval(function() {
            const popButtons = document.querySelector(".adm-center-popup-wrap").querySelectorAll("button");
            if(popButtons.length > 2) {
                clearInterval(checkPopReady);
                GM_deleteValue('myoption'); //删除对应的选项值，以免页面重复执行兑换操作，删除后则程序再次加载默认不执行
                GM_setValue('mystep', 2); //将当前步骤设置为第二步
                popButtons[0].click(); //模拟点击选择地址按钮，如果页面逻辑调整，则需要更改
            }else{
                console.log("还没有弹出");
            }
        }, 100)
    }
    /***
    这是第二步，跳转到地址选择界面
    等待页面加载完成，点击选择地址按钮
    ***/
    function secondStep() {
        const checkAddressLoad = setInterval(function() {
            const addressElement = document.querySelector(".adm-nav-bar").nextSibling; //确定地址是否加载，如果该区域的文本已经存在“默认”字样，则地址已经加载完成
            if(addressElement.textContent.includes("默认")){
                //console.log(addressElement.textContent);
                clearInterval(checkAddressLoad);
                GM_setValue('mystep', 3); //将当前步骤设置为第三步
                document.querySelectorAll(".adm-button-primary")[1].click(); //模拟点击地址确认按钮，如果页面逻辑变更，则需要修改
            }
        }, 100)
    }
    /***
    这是第三步
    第三步已经弹出兑换框，而且地址应该已经选择完成
    在确定页面加载完成以后，点击兑换，并且延时执行二次确认按钮
    ***/
    function thirdStep() {
        const submitPopLoad = setInterval(function() {
            const checkLoad = document.querySelectorAll("span.text-blue.text-bold");
            if(checkLoad.length > 0) {
                clearInterval(submitPopLoad);
                GM_setValue('mystep', 1); //将当前步骤重置为第一步
                document.querySelector(".adm-modal-button-primary").click(); //模拟点击兑换按钮
                setTimeout(() => {
                    document.querySelector(".adm-dialog-button-bold").click(); //系统弹出二次确认界面，延迟300毫秒执行
                }, 300);
            }
        }, 100)
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
})();
