// 引入 ERP API 模块
import {fetchErpOrders, sendNewAddress} from './erpApi.js';
const { createApp, ref, onMounted } = Vue;
const app = createApp({
    setup() {
        const initialOrders = [
            {
                saleOrderCode: "TEST_ORDER",
                warehouseOrderCode: "TEST_ORDER",
                name: "Felix95",
                phone: "8613702393100",
                countryCode: "DE",
                state: "",
                cityName: "Hilden",
                postalCode: "40721",
                companyName: "Sonni Sanitär GmbH",
                line1: "Kleinhülsen",
                line2: "",
                line3: "",
                doorplate: "12",
                createdDate: "2023-10-03",
                updateDate: '',
                editable: false,
                googleVertify: "",
                googleVertify_area_level_1: "",
                googleVertify_area_level_2: "",
                googleVertify_area_level_3: "",
                googleVertify_street_address: "",
                googleVertify_street_num: "",
                googleVertify_postcode: "",
                check: null,
                update: null
            }
        ];

        const orders = ref([...initialOrders]);
        const orderData = ref(JSON.parse(JSON.stringify(initialOrders))); // 深拷贝初始数据到缓存

        const selectedOrderIndex = ref(null);
        const mapInstance = ref(null);
        const infowindow = ref(null);
        const marker = ref(null);
        const tabContent = ref(null); // 用于引用 Tab-1 的内容容器
        const inputText = ref(''); // 文本框内容
        const checkResultDialogVisible = ref(false);
        const checkResult = ref([]); // 存储检查结果

        // 获取国旗图标 URL
        const getFlagUrl = (countryCode) => {
            return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
        };

        // 发送订单
        const sendOrder = async (index) => {
            const order = orders.value[index];
            const check = !checkOrderDetail(order);
            if (check == true)  {
                // 构造请求体
                const requestBody = {
                    saleOrderCode: order.saleOrderCode,
                    name: order.name,
                    phone: order.phone,
                    state: order.state,
                    cityName: order.cityName,
                    postalCode: order.postalCode,
                    companyName: order.companyName,
                    line1: order.line1,
                    line2: order.line2,
                    line3: order.line3,
                    doorplate: order.doorplate
                };

                // 调用 ERP API 模块
                try {
                    // 构建 XML 请求体
                    const user = 'Admin'; // 替换为实际用户名
                    const password = 'Admin2022@EC'; // 替换为实际密码
                    const response = await sendNewAddress(requestBody, user, password);

                    // 检查 response.code 是否为 200
                    if (response.code !== "200") {
                        alert(`ERP 返回的 code: ${response.code}, message: ${response.message}`);
                        return;
                    }
                    else {
                        console.warn('ERP 返回的 code 不是 200，忽略该响应');
                        alert(`ERP 返回的 code: ${response.code}, message: ${response.message}`);
                        return;
                    }

                } catch (error) {
                    console.error('请求 ERP 失败:', error);
                    alert('同步失败，请检查网络或联系管理员。');
                }
            }
            else{
                order.check = !checkOrderDetail(order);
                // 显示检查结果弹窗
                checkResultDialogVisible.value = true;
            }
        };

        // 初始化地图
        const initMap = () => {
            // 创建地图实例
            mapInstance.value = new google.maps.Map(document.getElementById('map'), {
                center: { lat: 37.7749, lng: -122.4194 }, // 默认中心点
                zoom: 12,
                mapTypeId: 'hybrid' // 默认显示卫星图像
            });

            // 创建默认标记（初始不可见）
            marker.value = new google.maps.Marker({
                position: { lat: 37.7749, lng: -122.4194 }, // 默认位置
                map: mapInstance.value, // 绑定到地图实例
                title: '默认标记',
                opacity: 1, // 透明度（0 到 1 之间）
                visible: false, // 初始不可见
                zIndex: 1, // 堆叠顺序
            });

            // 创建默认信息窗口
            infowindow.value = new google.maps.InfoWindow({
                content: '默认信息窗口内容',
                position: { lat: 37.7749, lng: -122.4194 }, // 默认位置
                maxWidth: 200, // 最大宽度
            });

            // // 默认显示第一个订单的地图
            // selectOrder(0);
        };

        // 更新地图
        const updateMap = (dataRow, address) => {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK') {
                    const location = results[0].geometry.location;
                    dataRow['googleVertify'] = results[0]["formatted_address"];
                    dataRow['googleVertify_area_level_1'] = getAddressComponents(results[0],"administrative_area_level_1")
                    dataRow['googleVertify_area_level_2'] = getAddressComponents(results[0],"administrative_area_level_2")
                    dataRow['googleVertify_area_level_3'] = getAddressComponents(results[0],"administrative_area_level_3")
                    dataRow['googleVertify_street_address'] = getAddressComponents(results[0],"route")
                    dataRow['googleVertify_street_num'] = getAddressComponents(results[0],"street_number")
                    dataRow['googleVertify_postcode'] = getAddressComponents(results[0],"postal_code")

                    // 更新地图中心
                    mapInstance.value.setCenter(location);
                    mapInstance.value.setZoom(20); // 设置为最大缩放级别

                    // 更新标记位置
                    marker.value.setPosition(location);
                    marker.value.setTitle(results[0].formatted_address);
                    marker.value.setVisible(true); // 显示标记

                    // 更新信息窗口内容和位置
                    infowindow.value.setContent(results[0].formatted_address);
                    infowindow.value.setPosition(location);
                    infowindow.value.open(mapInstance.value, marker.value);
                    return results
                } else {
                    alert('地址解析失败，请检查地址是否正确。');
                    return []
                }
            });
        };

        function checkOrderDetail(order) {
            const result = [];

            // 检查必填字段是否为空
            if (!order.name) {
                result.push({ property: '姓名', status: '失败', reason: '姓名为空' });
            } else if (order.name.length > 40) {
                result.push({ property: '姓名', status: '失败', reason: '姓名超过40个字符' });
            } else {
                result.push({ property: '姓名', status: '通过', reason: '' });
            }

            if (!order.phone) {
                result.push({ property: '电话', status: '失败', reason: '电话为空' });
            } else {
                result.push({ property: '电话', status: '通过', reason: '' });
            }

            if (!order.state) {
                result.push({ property: '州/省', status: '失败', reason: '州/省为空' });
            } else {
                result.push({ property: '州/省', status: '通过', reason: '' });
            }

            if (!order.cityName) {
                result.push({ property: '城市', status: '失败', reason: '城市为空' });
            } else {
                result.push({ property: '城市', status: '通过', reason: '' });
            }

            if (!order.line1) {
                result.push({ property: '街道1', status: '失败', reason: '街道1为空' });
            } else if (order.line1.length > 40) {
                result.push({ property: '街道1', status: '失败', reason: '街道1超过40个字符' });
            } else {
                result.push({ property: '街道1', status: '通过', reason: '' });
            }

            if (!order.doorplate) {
                result.push({ property: '门牌号', status: '失败', reason: '门牌号为空' });
            } else {
                result.push({ property: '门牌号', status: '通过', reason: '' });
            }

            // 更新检查结果
            checkResult.value = result;

            // 如果有任何一项检查失败，设置 check 为 false
            const hasError = result.some(item => item.status === '失败');
            return hasError
        };
        // 检查订单数据
        const checkOrder = (index) => {
            const order = orders.value[index];
            order.check = !checkOrderDetail(order);
            // 显示检查结果弹窗
            checkResultDialogVisible.value = true;
        };
        // 鼠标悬停效果
        const hoverOrder = (index) => {
            const orderUnit = document.querySelectorAll('.order-unit')[index];
            orderUnit.style.transform = 'scale(1.01)';
        };

        const unhoverOrder = (index) => {
            const orderUnit = document.querySelectorAll('.order-unit')[index];
            orderUnit.style.transform = 'scale(1)';
        };

        // 选择订单并更新地图
        const selectOrder = (index) => {
            if (selectedOrderIndex.value != index)
            {
                selectedOrderIndex.value = index;
            }
        };

        const googleVertifyOrder = (index) => {
            const order = orders.value[index];
            const strAddress = `${order.line1} ${order.doorplate}, ${order.cityName}, ${order.state}, ${order.postalCode}, ${order.countryCode}`;
            updateMap(order, strAddress);
        };

        // 撤销操作
        const undoOrder = (index) => {
            console.log('撤销操作的索引:', index);

            if (index >= 0 && index < orderData.value.length && orderData.value[index]) {
                // 用缓存的数据覆盖 orders 中的对应数据
                console.log('orderData.value[index]:', orderData.value[index]);
                console.log('orders.value[index]:', orders.value[index]);
                orders.value[index] = JSON.parse(JSON.stringify(orderData.value[index]));
                alert(`订单 ${orders.value[index].saleOrderCode} 已撤销到上次同步的状态！`);
            } else {
                alert('没有可撤销的缓存数据！');
            }
        };

        // 删除订单
        const deleteOrder = (index) => {
            orders.value.splice(index, 1);
            if (selectedOrderIndex.value === index) {
                selectedOrderIndex.value = 0; // 重置选中状态
            }
            orderData.value.splice(index, 1);
            if (selectedOrderIndex.value === index) {
                selectedOrderIndex.value = 0; // 重置选中状态
            }
        };

        // 监听鼠标滚轮事件
        const handleWheel = (event) => {
            if (tabContent.value) {
                // 阻止默认滚动行为
                event.preventDefault();
                // 根据滚轮方向调整滚动条位置
                tabContent.value.scrollBy({
                    top: event.deltaY,
                    behavior: 'smooth',
                });
            }
        };

        const handlePaste = (event) => {
            event.preventDefault(); // 阻止默认粘贴行为
            const pasteText = (event.clipboardData || window.clipboardData).getData('text');
            // console.log('粘贴内容:', pasteText); // 调试日志
            // 按空格和分号切割字符串
            const lines = pasteText.split(/[\s;]+/).filter(line => line.trim() !== '');
            // console.log('切割后的内容:', lines); // 调试日志
            // 将切割后的字符串拼接为多行文本，并直接更新到文本框
            inputText.value = lines.join('\n');
            // console.log('更新后的 inputText:', inputText.value); // 调试日志
        };

        const cleanInput = (event) => {
            inputText.value = '';
            // console.log('清空 inputText'); // 调试日志
        };

        function filterOrderData(response) {
            return response.data.map(order => {
                const { saleOrderCode, warehouseOrderCode, orderAddress } = order;

                // 提取 orderAddress 中的指定字段
                const { name, phone, countryCode, state, cityName, postalCode,
                    companyName, line1, line2, line3, doorplate, createdDate } = orderAddress;

                // 返回筛选后的订单信息
                return {
                    saleOrderCode,
                    warehouseOrderCode,
                    name,
                    phone,
                    countryCode,
                    state,
                    cityName,
                    postalCode,
                    companyName,
                    line1,
                    line2,
                    line3,
                    doorplate,
                    createdDate,
                    updateDate: "", // 默认空字符串
                    editable: false,
                    googleVertify: "",
                    googleVertify_area_level_1: "",
                    googleVertify_area_level_2: "",
                    googleVertify_area_level_3: "",
                    googleVertify_street_address: "",
                    googleVertify_street_num: "",
                    googleVertify_postcode: "",
                    check:null,
                    update:null
                };
            });
        };

        function getAddressComponents(address,typeName) {
            for (var i = 0; i < address.address_components.length; i++) {
                var component = address.address_components[i];
                if (component.types.includes(typeName)) {
                    return component.long_name;
                }
            }
            return '';
        }

        // 同步文本框内容
        const syncText = async () => {
            if (!inputText.value.trim()) {
                alert('请输入内容后再同步！');
                // console.log('为空！不请求erp api!')
                return;
            }
            // console.log('不为空！开始请求erp api!')
            // 按空格和分号切割字符串
            const orderIds = inputText.value.split(/[\s;]+/).filter(line => line.trim() !== '');

            // 调用 ERP API 模块
            try {
                // 构建 XML 请求体
                const user = 'Admin'; // 替换为实际用户名
                const password = 'Admin2022@EC'; // 替换为实际密码
                const page = 1;
                const pageSize = 1000;
                const response = await fetchErpOrders(orderIds, user, password, page, pageSize);

                // console.log('ERP 返回的数据:', response);
                // 检查 response.code 是否为 200
                if (response.code !== "200") {
                    console.warn('ERP 返回的 code 不是 200，忽略该响应');
                    alert(`ERP 返回的 code: ${response.code}, message: ${response.message}`);
                    return;
                }

                // 检查 response.data 是否存在且是数组
                if (!response || !response.data || !Array.isArray(response.data) || !response.data.length) {
                    alert('ERP 返回的数据格式不正确或data数组为空！');
                    return;
                }

                // 调用筛选方法
                const filteredOrders = filterOrderData(response);
                const filteredOrdersCopy = JSON.parse(JSON.stringify(filteredOrders));
                // 将 filteredOrders 扩展到 orders 中
                orders.value = [...orders.value, ...filteredOrders];
                orderData.value = [...orderData.value, ...filteredOrdersCopy];

            } catch (error) {
                console.error('请求 ERP 失败:', error);
                alert('同步失败，请检查网络或联系管理员。');
            }
        };

        // 在组件挂载后添加事件监听
        onMounted(() => {
            initMap();
            if (tabContent.value) {
                // 监听鼠标滚轮事件
                tabContent.value.addEventListener('wheel', handleWheel, { passive: false });
            }
            // console.log(orderData.value)
        });

        return {
            orders,
            selectedOrderIndex,
            tabContent,
            inputText,
            checkResultDialogVisible, // 新增：检查结果弹窗的可见性
            checkResult, // 新增：检查结果
            syncText,
            cleanInput,
            getFlagUrl,
            sendOrder,
            selectOrder,
            googleVertifyOrder,
            deleteOrder,
            undoOrder,
            hoverOrder,
            unhoverOrder,
            checkOrder,
            initMap,
            handlePaste
        };
    },
});

app.use(ElementPlus);
app.mount('#app');

// Google Maps 初始化回调
window.initMap = () => {
    app._instance.proxy.initMap();
};
