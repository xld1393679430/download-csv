// ==UserScript==
// @name         download csv
// @namespace    http:///
// @version      0.1
// @description  try to take over the world!
// @author       AI
// @match        https://prokaryote.leyantech.com/*
// @grant        none
// @connect      prokaryote.leyantech.com
// @require      https://code.jquery.com/jquery-1.12.4.min.js
// ==/UserScript==

$(document).ready(function(){
    let total = 0
    let MAX_LIMIT = 10
    let batchTimes = 0
    let SpuIDs = []
    let totalData = []
    let getItemsTasks = []
    let getInventorieTasks = []
    let currentDownload = 0
    let totalDownLoad = 0
    let btnDom = null
    let btnText = '导出spu'
    let downloading = false
    let Token = null

    function initData() {
        total = 0
        MAX_LIMIT = 10
        batchTimes = 0
        SpuIDs = []
        totalData = []
        getItemsTasks = []
        getInventorieTasks = []
        currentDownload = 0
        totalDownLoad = 0
        downloading = false
    }

    function downloadCsv(csvData) {
        let alink = document.createElement("a");
        let fileName = '材质信息.csv'
        let _utf = "\uFEFF";
        if (window.Blob && window.URL && window.URL.createObjectURL) {
            const csvDataBlob = new Blob([_utf + csvData], {
                type: "text/csv",
            });
            alink.href = URL.createObjectURL(csvDataBlob);
        }
        document.body.appendChild(alink);
        alink.setAttribute("download", fileName);
        alink.click();
        document.body.removeChild(alink);
    }

    function getCsvData(exportData = []) {
        let row = "", csvData = "";
        const exportTitle = ["spu_id", "标题", "属性", "模式", "自定义值"]
        for (const title of exportTitle) {
            row += '"' + title + '",';
        }
        csvData += row + "\r\n";
        for (const item of exportData ) {
            row = "";
            for (let key in item) {
                row += '"' + item[key] + '",';
            }
            csvData += row + "\r\n";
        }
        return csvData
    }

    function getItems(page, per_page) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: 'https://apiproxy.leyanbot.com/item/items/search',
                type: 'post',
                headers: {
                    "Authorization": `Bearer ${Token}`,
                    "config-id": "1",
                },
                dataType: "json",
                data: JSON.stringify({
                    page,
                    per_page
                }),
                success: function(res){
                    resolve(res)
                },
                error: function(err) {
                    reject(err)
                }
            })
        })
    }

    function getInventorie(spu_id) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: 'https://accountproxy.leyanbot.com/api/inventories/' + spu_id,
                type: 'get',
                headers: {
                    "authentication-token": `${Token}`,
                    "config-id": "1",
                },
                success: function(res){
                    currentDownload++
                    btnDom.html(`正在下载中...（${currentDownload}/${totalDownLoad}）`)
                    resolve(res)
                },
                error: function(err) {
                    reject(err)
                }
            })
        })
    }

    function init() {
        $.ajax({
            url: 'https://apiproxy.leyanbot.com/item/items/search',
            type: 'post',
            headers: {
                "Authorization": `Bearer ${Token}`,
                "config-id": "1",
            },
            dataType: "json",
            success: function(res){
                total = parseInt(res.total)
                batchTimes = Math.ceil(total / MAX_LIMIT)
                for (let i = 0; i < batchTimes; i++) {
                    let promise = getItems(i + 1, MAX_LIMIT)
                    getItemsTasks.push(promise)
                }
                Promise.all(getItemsTasks).then(res => {
                    SpuIDs = res.map(item => item.items).flat(Infinity).map(item => item.spu_id)
                    for (let i = 0; i < SpuIDs.length; i++) {
                        let promise = getInventorie(SpuIDs[i])
                        getInventorieTasks.push(promise)
                    }
                    totalDownLoad = getInventorieTasks.length
                    btnDom.html(`正在下载中...（0/${totalDownLoad}）`)
                    Promise.all(getInventorieTasks).then(res => {
                        btnDom.html(`已下载了${totalDownLoad}条数据`)
                        initData()
                        setTimeout(() => {
                            btnDom.html(btnText)
                        }, 2000)
                        totalData = res.map(item => {
                            item.spu.spu_properties = item.spu.spu_properties.map(sItem => {
                                sItem = Object.assign({}, sItem, { title: item.spu.title, spu_id: item.spu.num_iid})
                                return sItem;
                            })
                            return item
                        }).map(item => item.spu.spu_properties)
                            .flat(Infinity).map(item => {
                            return {
                                spu_id: item.spu_id,
                                title: item.title,
                                name: item.name,
                                mode: item.mode,
                                override: item.override,
                            }
                        })
                        const csvData = getCsvData(totalData)
                        downloadCsv(csvData)
                    })
                })
            },
        })
    }

    const btn = document.createElement('button');
    btn.id = 'btn';
    btn.style ='display:block;z-index:999;position:fixed; right:10px;top:45%;cursor:pointer;background: #1890ff; border: 1px solid rgb(217, 217, 217); color: #fff;padding: 10px 15px;';
    btn.innerHTML = btnText
    $('body').append(btn);

    btnDom = $('#btn')
    btnDom.on('click', function() {
        Token = JSON.parse(localStorage.getItem('prokaryote/token'))
        if(!Token) {
            alert('token错误，请重新登录')
            return
        }
        if (downloading) {
            return
        }
        btnDom.html('正在下载中...')
        downloading = true
        init()
    })
});