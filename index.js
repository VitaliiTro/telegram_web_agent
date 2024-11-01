var passwordContainer = document.getElementById('password-container');
if (passwordContainer) {
    passwordContainer.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    // Перевірка наявності параметра логіну в URL
    const urlParams = new URLSearchParams(window.location.search);
    const agentParam = urlParams.get('agent');
    if (agentParam) {
        localStorage.setItem('agentLogin', agentParam);
        document.getElementById('password-container').style.display = 'none';
        document.getElementById('page-wrap').style.display = 'block';
    }

    // Запуск функції displayOrders після завантаження сторінки
    displayOrders();

    // Функція, яка приховує клавіатуру при втраті фокусу від поля пошуку
    function hideKeyboard() {
        document.activeElement.blur(); // Приховати клавіатуру
    }

    // Додаємо обробник події на втрату фокусу від поля пошуку
    var searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("blur", hideKeyboard);

        // Додаємо обробник подій для пошуку
        searchInput.addEventListener("keyup", searchOrders);
    }

    // Додаємо обробник події на прокручування сторінки для приховання клавіатури
    window.addEventListener("scroll", hideKeyboard);
});

function displayOrders() {
    // Запит на отримання XML-файлу з замовленнями
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", "Orders.xml", true);
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var xmlDoc = xmlhttp.responseXML;
            var agents = xmlDoc.getElementsByTagName("Agent");
            var passwordInput = document.getElementById("password");
            var agentLogin = passwordInput ? passwordInput.value.trim() : null;

            // Якщо значення логіну дорівнює null або порожній строкі, отримуємо його з локального сховища
            if (agentLogin === null || agentLogin === "") {
                agentLogin = localStorage.getItem('agentLogin');
            }

            // Якщо знайдено збережений логін або поле вводу не порожнє, встановлюємо його в поле вводу
            if (agentLogin !== null && passwordInput) {
                passwordInput.value = agentLogin;
            }

            // Перевіряємо, чи поле вводу пароля порожнє перед викликом перевірки пароля
            if (passwordInput && passwordInput.value.trim() !== "") {
                checkPassword();
            }

            // Пошук агента за логіном
            for (var i = 0; i < agents.length; i++) {
                var agent = agents[i];
                var login = agent.getAttribute("Login");
                if (login === agentLogin) {
                    displayOrdersContent(agent);
                    return; // Завершуємо функцію після знаходження агента
                }
            }
        }
    };
    xmlhttp.send();
}

async function checkPassword() {
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('Orders.xml');
        const text = await response.text();

        const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
        const agents = xmlDoc.getElementsByTagName('Agent');

        let authenticated = Array.from(agents).some(agent => {
            const login = agent.getAttribute('Login');
            return login === password;
        });

        if (authenticated || password.startsWith('UA002-0')) {
            localStorage.setItem('authenticated', 'true');
            localStorage.setItem('agentLogin', password);
            document.getElementById('password-container').style.display = 'none';
            document.getElementById('page-wrap').style.display = 'block';

            displayOrders();
        } else {
            alert('Невірний логін');
        }
    } catch (error) {
        console.error('Error loading or parsing XML:', error);
    }
}

// Функція для відображення замовлень після успішної перевірки логіну
function displayOrdersContent(agent) {
    var agentName = agent.getAttribute("AgentName");
    var orders = agent.getElementsByTagName("Order");
    var agentNameElement = document.getElementById("agentName");
    var ordersTableBody = document.getElementById("ordersBody");

    // Виведення ім'я агента
    agentNameElement.textContent = "Агент: " + agentName;

    // Виведення інформації по замовленнях агента у вигляді табличок
    ordersTableBody.innerHTML = "";
    var totalSumOrder = 0;
    var totalSumInvoice = 0;

    for (var i = 0; i < orders.length; i++) {
        var order = orders[i];
        var stage = order.getAttribute("Stage");
        var tt = order.getAttribute("TT");
        var address = order.getAttribute("Adress");
        var sumOrder = parseFloat(formatAmount(order.getAttribute("SumOrder"))) || 0;
        var sumInvoice = parseFloat(formatAmount(order.getAttribute("SumInvoice"))) || 0;
        var InvoiceNumber = order.getAttribute("InvoiceNumber");
        var xpEditor = order.getAttribute("XPEditor");

        totalSumOrder += sumOrder;
        totalSumInvoice += sumInvoice;

        var row = document.createElement("tr");
        row.setAttribute("data-stage", stage); // Встановлюємо атрибут data-stage
        row.innerHTML =
            "<td>" + stage + "</td>" +
            "<td>" + tt + "</td>" +
            "<td>" + address + "</td>" +
            "<td>" + sumOrder.toFixed(2) + "</td>" +
            "<td>" + sumInvoice.toFixed(2) + "</td>" +
            "<td>" + xpEditor + "</td>" +
            "<td>" + InvoiceNumber + "</td>";

        ordersTableBody.appendChild(row);
    }

    // Додаємо підсумковий рядок
    var totalRow = document.createElement("tr");
    totalRow.style.backgroundColor = "#ffffff"; // встановлення білого фону
    totalRow.innerHTML =
        "<td colspan='3'><strong>Загалом</strong></td>" +
        "<td><strong>" + totalSumOrder.toFixed(2) + "</strong></td>" +
        "<td><strong>" + totalSumInvoice.toFixed(2) + "</strong></td>" +
        "<td></td>" +
        "<td></td>";
    ordersTableBody.appendChild(totalRow);

    searchOrders();
}

function formatAmount(amount) {
    // Видалення пробілів між тисячами та заміна коми на крапку
    return amount.replace(/\s/g, "").replace(",", ".");
}


// Функція для пошуку замовлень
function searchOrders() {
    var input, filter, table, tr, td, i, txtValue;
    input = document.getElementById("searchInput");
    filter = input.value.toUpperCase();
    table = document.getElementById("ordersTable");
    tr = table.getElementsByTagName("tr");

    for (i = 0; i < tr.length; i++) {
        td = tr[i].getElementsByTagName("td")[1]; // Вибираємо другу комірку (ТТ) для пошуку
        var tdAddress = tr[i].getElementsByTagName("td")[2]; // Вибираємо третю комірку (Адреса) для пошуку
        if (td && tdAddress) {
            txtValue = td.textContent || td.innerText;
            txtAddressValue = tdAddress.textContent || tdAddress.innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1 || txtAddressValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}
