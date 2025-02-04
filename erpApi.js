// erpApi.js

/**
 * 向 ERP 系统发起订单信息获取请求
 * @param {string[]} orderIds - 订单 ID 列表
 * @param {string} user - 用户名
 * @param {string} password - 密码
 * @returns {Promise<string>} - 返回 ERP 系统的响应数据
 */
export const fetchErpOrders = async (orderIds, user, password, page, pageSize) => {
    try {
        // 构建 XML 请求体
        const orderArr = JSON.stringify(orderIds); // 将订单 ID 列表转换为 JSON 字符串

        const xmlStr = `<?xml version="1.0" encoding="UTF-8"?>
            <SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
                    xmlns:ns1="http://www.example.org/Ec/">
                <SOAP-ENV:Body>
                    <ns1:callService>
                        <paramsJson>{
                            "page":${page},
                            "pageSize":${pageSize},
                            "getDetail":0,
                            "getAddress":1,    
                            "condition":{
                                "saleOrderCodes":${orderArr}
                            }
                        }</paramsJson>
                        <userName>${user}</userName>
                        <userPass>${password}</userPass>
                        <service>getOrderList</service>
                    </ns1:callService>
                </SOAP-ENV:Body>
            </SOAP-ENV:Envelope>`;

        // 发送 SOAP 请求
        const response = await fetch("https://sunny-eb.eccang.com/default/svc-open/web-service-v2", {
            method: 'POST',
            body: xmlStr
        });
        if (!response.ok) {
            throw new Error('请求失败');
        }
        const data = await response.text();
        // 解析 XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");

        // 提取 <response> 标签内容
        const responseNode = xmlDoc.getElementsByTagName("response")[0];
        if (!responseNode) {
            throw new Error('未找到 <response> 标签');
        }

        // 将 <response> 内容解析为 JSON 对象
        const responseText = responseNode.textContent;
        const responseDict = JSON.parse(responseText);

        // 返回解析后的字典
        return responseDict;
    }
    catch (error) {
        console.error('请求 ERP 失败:', error);
        throw error; // 抛出错误以便调用方处理
    }
};

/**
 * 向 ERP 系统发起订单信息获取请求
 * @param {string[]} newData - 订单信息更新列表
 * @param {string} user - 用户名
 * @param {string} password - 密码
 * @returns {Promise<string>} - 返回 ERP 系统的响应数据
 */
export const sendNewAddress = async (newData, user, password) => {
    try {
        const xmlStr = `<?xml version="1.0" encoding="UTF-8"?>
            <SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
                    xmlns:ns1="http://www.example.org/Ec/">
                <SOAP-ENV:Body>
                    <ns1:callService>
                        <paramsJson>{
                            "actionType":"EDIT",
                            "saleOrderCode":"${newData['saleOrderCode']}", 
                            "orderAddress":{
                                "name":"${newData['name']}",
                                "phone":"${newData['phone']}",
                                "state":"${newData['state']}",
                                "cityName":"${newData['cityName']}",
                                "postalCode":"${newData['postalCode']}",
                                "line1":"${newData['line1']}",
                                "line2":"${newData['line2']}",
                                "line3":"${newData['line3']}",
                                "doorplate":"${newData['doorplate']}",
                                "company":"${newData['companyName']}"
                            }
                        }</paramsJson>
                        <userName>${user}</userName>
                        <userPass>${password}</userPass>
                        <service>syncOrder</service>
                    </ns1:callService>
                </SOAP-ENV:Body>
            </SOAP-ENV:Envelope>`;

        console.log(xmlStr)
        // 发送 POST 请求
        const response = await fetch('https://sunny-eb.eccang.com/default/svc-open/web-service-v2', {
            method: 'POST',
            body: xmlStr
        });

        if (!response.ok) {
            throw new Error('请求失败');
        }
        const data = await response.text();
        // 解析 XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");

        // 提取 <response> 标签内容
        const responseNode = xmlDoc.getElementsByTagName("response")[0];
        if (!responseNode) {
            throw new Error('未找到 <response> 标签');
        }

        // 将 <response> 内容解析为 JSON 对象
        const responseText = responseNode.textContent;
        const responseDict = JSON.parse(responseText);

        // 返回解析后的字典
        return responseDict;
    }
    catch (error) {
        console.error('请求 ERP 失败:', error);
        throw error; // 抛出错误以便调用方处理
    }
};

    //     // 根据 ERP 返回的结果更新订单状态
    //     if (result.code === "200") {
    //         alert(`订单 ${order.saleOrderCode} 已成功发送！`);
    //         order.update = true; // 标记订单已更新
    //     } else {
    //         alert(`订单 ${order.saleOrderCode} 发送失败：${result.message}`);
    //     }
    // } catch (error) {
    //     console.error('发送订单失败:', error);
    //     alert('发送订单失败，请检查网络或联系管理员。');
    // }
