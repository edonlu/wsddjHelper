# wsddjHelper
简陋的捡漏助手
需要在TamperMonkey中使用

## 本地存储的格式

因为需要对数据持久化存储，所以借用TamperMonkey的GM_setValue和GM_getValue来存储。

### 数据userinfo

格式示例：
```json
{
    "options": [ //只把有库存的商品存入这里
        {
            "bizParam": "6000", //所需积分
            "id": 2657, //商品ID
            "remainCount": 20, //库存
            "rewardName": "四周年礼盒" //商品名称
        }
    ],
    "address": "详细收件地址",
    "reciever": "收件人",
    "phone": "联系电话",
    "time": 8 //向服务器请求库存的间隔
}
```
关于向服务器请求的时间间隔，程序会简单的验证，允许的取值范围是-1到10之间。其中如果填-1的情况下，程序不向服务器请求库存，也就是程序不执行。
而且，请求的时间间隔是有浮动的，也就是如果设置间隔为5分钟，那么请求的间隔会在5分钟上下浮动，浮动区间为4-6分钟之间。
在取值为0的时候，一般是月初1号那天，需要频繁请求库存信息，程序执行的间隔在0-1分钟之间。
因为库存不定期更新，所以其他时间不要设置过于频繁的请求。

### 数据storage

格式示例：
```json
[
    {
        "time": "2025/8/14 09:57:48",
        "storage": [
            {
                "bizParam": "1000",
                "id": 2921,
                "remainCount": 0,
                "rewardName": "新款帆布袋"
            },
            {
                "bizParam": "2000",
                "id": 2654,
                "remainCount": 0,
                "rewardName": "随机鼠标垫"
            },
            {
                "bizParam": "1000",
                "id": 2655,
                "remainCount": 0,
                "rewardName": "小宝抱枕"
            },
            {
                "bizParam": "1000",
                "id": 2656,
                "remainCount": 0,
                "rewardName": "小宝帆布袋"
            },
            {
                "bizParam": "6000",
                "id": 2657,
                "remainCount": 20,
                "rewardName": "四周年礼盒"
            }
        ]
    },
    {
        "time": "2025/8/14 09:50:32",
        "storage": [
            {
                "bizParam": "1000",
                "id": 2921,
                "remainCount": 0,
                "rewardName": "新款帆布袋"
            },
            {
                "bizParam": "2000",
                "id": 2654,
                "remainCount": 0,
                "rewardName": "随机鼠标垫"
            },
            {
                "bizParam": "1000",
                "id": 2655,
                "remainCount": 0,
                "rewardName": "小宝抱枕"
            },
            {
                "bizParam": "1000",
                "id": 2656,
                "remainCount": 0,
                "rewardName": "小宝帆布袋"
            },
            {
                "bizParam": "6000",
                "id": 2657,
                "remainCount": 20,
                "rewardName": "四周年礼盒"
            }
        ]
    },
    //以下省略，最多保存10条记录
]
```
关于这个记录的格式说明，其实是跟上面那个是一样的。每次请求后，程序把最新的记录中，有库存的商品信息提取出来，存入userinfo中，方便填充页面的下拉选择框。

## 程序截图

![截图1](https://github.com/edonlu/wsddjHelper/blob/main/screenshot1.png?raw=true)

![截图2](https://github.com/edonlu/wsddjHelper/blob/main/screenshot3.png?raw=true)

![截图3](https://github.com/edonlu/wsddjHelper/blob/main/screenshot2.png?raw=true)

![通知截图](https://github.com/edonlu/wsddjHelper/blob/main/screenshot4.png?raw=true)

## 其他说明

- 程序不对填写的地址做验证，所以自行检查填写的信息是否有误。
- 最后的确认兑换按钮，直接对服务器发送兑换请求，没有二次确认。
- 本程序只兑换实物商品，虚拟商品没有库存限制，随便兑换。
- 本程序只是一个助手，不保证兑换成功。
