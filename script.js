// Initialize database
let students = [];
let payments = [];
let subjects = ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Social Studies", "English", "Hindi", "Sanskrit"];
let packages = ["Monthly", "Course-based", "Hourly individual"];

// Check if data exists in local storage
if (localStorage.getItem('students')) {
    students = JSON.parse(localStorage.getItem('students'));
}

if (localStorage.getItem('payments')) {
    payments = JSON.parse(localStorage.getItem('payments'));
}

// Generate unique IDs
function generateStudentId() {
    return 'STU-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

function generatePaymentId() {
    return 'PAY-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

// Date formatting and manipulation functions
function formatDate(date) {
    if (!date) return '';
    // Always use parseDate to ensure correct interpretation
    date = parseDate(date);
    if (!date || isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function addDays(date, days) {
    // Always use parseDate to ensure correct interpretation
    const result = new Date(parseDate(date));
    result.setDate(result.getDate() + days);
    return result;
}

// Utility: Parse date from dd/mm/yy or dd/mm/yyyy to Date object
function parseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr === 'string') {
        // Accept dd/mm/yy or dd/mm/yyyy
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            let day = parseInt(parts[0], 10);
            let month = parseInt(parts[1], 10) - 1; // JS months are 0-based
            let year = parseInt(parts[2], 10);
            if (year < 100) {
                // Assume 20xx for 2-digit years
                year += 2000;
            }
            return new Date(year, month, day);
        }
    }
    return new Date(dateStr);
}

function getDueDateStatus(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = parseDate(dueDate);
    if (!due) return 'normal';
    due.setHours(0, 0, 0, 0);

    if (due < today) {
        return 'overdue';
    } else {
        return 'normal';
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('students', JSON.stringify(students));
    localStorage.setItem('payments', JSON.stringify(payments));
    // Always update UI after saving data
    updateDashboard();
    updateStudentsTable();
    updateFeeManagement();
}

// Toast notification system
function showToast(type, title, message) {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas ${iconClass} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Dashboard functionality
function updateDashboard() {
    const totalStudents = students.length;
    document.getElementById('totalStudents').textContent = totalStudents;
    
    // Calculate total fees collected
    const totalFeesCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);
    document.getElementById('totalFeesCollected').textContent = '₹' + totalFeesCollected.toLocaleString();
    
    // Calculate pending dues
    let pendingDues = 0;
    let dueThisWeek = 0;
    
    students.forEach(student => {
        if (student.installments && student.installments.length > 0) {
            student.installments.forEach(installment => {
                if (!installment.paid) {
                    pendingDues += installment.amount;

                    // Check if due this week
                    const dueDate = parseDate(installment.dueDate);
                    const oneWeekFromNow = addDays(new Date(), 7);
                    if (dueDate <= oneWeekFromNow && dueDate >= new Date()) {
                        dueThisWeek++;
                    }
                }
            });
        }
    });
    
    document.getElementById('totalPendingDues').textContent = '₹' + pendingDues.toLocaleString();
    document.getElementById('dueThisWeek').textContent = dueThisWeek;
    
    // Update recent dues table
    const recentDuesTable = document.getElementById('recentDuesTable').querySelector('tbody');
    recentDuesTable.innerHTML = '';
    
    const pendingInstallments = [];
    
    students.forEach(student => {
        if (student.installments && student.installments.length > 0) {
            student.installments.forEach(installment => {
                if (!installment.paid) {
                    pendingInstallments.push({
                        studentId: student.id,
                        name: student.name,
                        amount: installment.amount,
                        dueDate: installment.dueDate,
                        status: getDueDateStatus(installment.dueDate),
                        installmentId: installment.id
                    });
                }
            });
        }
    });
    
    // Sort by due date (closest first)
    pendingInstallments.sort((a, b) => parseDate(a.dueDate) - parseDate(b.dueDate));
    
    // Show only 5 most recent dues
    pendingInstallments.slice(0, 5).forEach(due => {
        const row = document.createElement('tr');
        
        let statusBadge = 'badge-success';
        if (due.status === 'overdue') statusBadge = 'badge-danger';
        if (due.status === 'upcoming') statusBadge = 'badge-warning';
        
        row.innerHTML = `
            <td>${due.studentId}</td>
            <td>${due.name}</td>
            <td>₹${due.amount.toLocaleString()}</td>
            <td>${formatDate(due.dueDate)}</td>
            <td><span class="badge ${statusBadge}">${due.status}</span></td>
            <td class="actions">
                <button class="action-btn payment" onclick="recordPayment('${due.studentId}', '${due.installmentId}')">
                    <i class="fas fa-rupee-sign"></i>
                </button>
                <button class="action-btn edit" onclick="sendReminder('${due.studentId}', '${due.installmentId}')">
                    <i class="fas fa-bell"></i>
                </button>
            </td>
        `;
        
        recentDuesTable.appendChild(row);
    });
    
    // Update charts
    updateCharts();
}

// Update dashboard charts
function updateCharts() {
    // Fee collection trend chart (last 6 months)
    const months = [];
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
        const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        months.push(month.toLocaleDateString('en-US', { month: 'short' }));
    }
    
    const collectionsData = Array(6).fill(0);
    
    payments.forEach(payment => {
        const paymentDate = parseDate(payment.date);
        for (let i = 0; i < 6; i++) {
            const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - i), 1);
            if (paymentDate.getMonth() === month.getMonth() && paymentDate.getFullYear() === month.getFullYear()) {
                collectionsData[i] += payment.amount;
            }
        }
    });
    
    // Initialize fee collection chart
    const feeCtx = document.getElementById('feeCollectionChart').getContext('2d');
    if (window.feeChart instanceof Chart) {
        window.feeChart.destroy();
    }
    
    window.feeChart = new Chart(feeCtx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Fee Collection (₹)',
                data: collectionsData,
                backgroundColor: 'rgba(67, 97, 238, 0.7)',
                borderColor: 'rgba(67, 97, 238, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Subject distribution chart
    const subjectCounts = {};
    subjects.forEach(subject => {
        subjectCounts[subject] = 0;
    });
    
    students.forEach(student => {
        if (student.subjects) {
            student.subjects.forEach(subject => {
                subjectCounts[subject]++;
            });
        }
    });
    
    const subjectLabels = Object.keys(subjectCounts);
    const subjectData = Object.values(subjectCounts);
    
    // Initialize subject distribution chart
    const subjectCtx = document.getElementById('subjectDistributionChart').getContext('2d');
    if (window.subjectChart instanceof Chart) {
        window.subjectChart.destroy();
    }
    
    window.subjectChart = new Chart(subjectCtx, {
        type: 'pie',
        data: {
            labels: subjectLabels,
            datasets: [{
                data: subjectData,
                backgroundColor: [
                    'rgba(67, 97, 238, 0.7)',
                    'rgba(72, 149, 239, 0.7)',
                    'rgba(76, 201, 240, 0.7)',
                    'rgba(247, 37, 133, 0.7)',
                    'rgba(181, 23, 158, 0.7)',
                    'rgba(114, 9, 183, 0.7)',
                    'rgba(86, 11, 173, 0.7)',
                    'rgba(63, 55, 201, 0.7)',
                    'rgba(58, 12, 163, 0.7)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Update Students Table
function updateStudentsTable() {
    const studentsTable = document.getElementById('studentsTable').querySelector('tbody');
    studentsTable.innerHTML = '';
    
    students.forEach(student => {
        const row = document.createElement('tr');
        
        // Calculate fee status
        let feeStatus = 'Paid';
        let statusBadge = 'badge-success';
        
        if (student.installments && student.installments.length > 0) {
            const pendingInstallments = student.installments.filter(inst => !inst.paid);
            if (pendingInstallments.length > 0) {
                const overdue = pendingInstallments.some(inst => 
                    getDueDateStatus(inst.dueDate) === 'overdue'
                );
                
                if (overdue) {
                    feeStatus = 'Overdue';
                    statusBadge = 'badge-danger';
                } else {
                    feeStatus = 'Pending';
                    statusBadge = 'badge-warning';
                }
            }
        }
        
        row.innerHTML = `
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>
                <a href="tel:${student.phone}" class="phone-link ${feeStatus === 'Overdue' ? 'overdue' : ''}">
                    ${student.phone}
                </a>
            </td>
            <td>${student.subjects ? student.subjects.join(', ') : '-'}</td>
            <td>${student.package || '-'}</td>
            <td>${formatDate(student.joinDate)}</td>
            <td><span class="badge ${statusBadge}">${feeStatus}</span></td>
            <td class="actions">
                <button class="action-btn edit" onclick="editStudent('${student.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn payment" onclick="viewPayments('${student.id}')">
                    <i class="fas fa-rupee-sign"></i>
                </button>
                <button class="action-btn delete" onclick="deleteStudent('${student.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        studentsTable.appendChild(row);
    });
}

// Update Fee Management tables
function updateFeeManagement() {
    // Defensive: check if elements exist
    const todayCollectionElem = document.getElementById('todayCollection');
    const monthCollectionElem = document.getElementById('monthCollection');
    const overdueAmountElem = document.getElementById('overdueAmount');
    const overdueStudentsElem = document.getElementById('overdueStudents');
    const pendingFeesTableElem = document.getElementById('pendingFeesTable');
    const recentPaymentsTableElem = document.getElementById('recentPaymentsTable');
    if (!todayCollectionElem || !monthCollectionElem || !overdueAmountElem || !overdueStudentsElem || !pendingFeesTableElem || !recentPaymentsTableElem) return;

    // Today's collection
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayPayments = payments.filter(payment => {
        const paymentDate = parseDate(payment.date);
        paymentDate.setHours(0, 0, 0, 0);
        return paymentDate.getTime() === today.getTime();
    });
    
    const todayCollection = todayPayments.reduce((sum, payment) => sum + payment.amount, 0);
    document.getElementById('todayCollection').textContent = '₹' + todayCollection.toLocaleString();
    
    // This month collection
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthPayments = payments.filter(payment => {
        const paymentDate = parseDate(payment.date);
        return paymentDate >= firstDayOfMonth;
    });
    
    const monthCollection = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
    document.getElementById('monthCollection').textContent = '₹' + monthCollection.toLocaleString();
    
    // Overdue amount and students
    let overdueAmount = 0;
    const overdueStudentIds = new Set();
    
    students.forEach(student => {
        if (student.installments && student.installments.length > 0) {
            student.installments.forEach(installment => {
                if (!installment.paid && getDueDateStatus(installment.dueDate) === 'overdue') {
                    overdueAmount += installment.amount;
                    overdueStudentIds.add(student.id);
                }
            });
        }
    });
    
    document.getElementById('overdueAmount').textContent = '₹' + overdueAmount.toLocaleString();
    document.getElementById('overdueStudents').textContent = overdueStudentIds.size;
    
    // Update pending fees table
    const pendingFeesTable = document.getElementById('pendingFeesTable').querySelector('tbody');
    pendingFeesTable.innerHTML = '';
    
    const pendingInstallments = [];
    
    students.forEach(student => {
        if (student.installments && student.installments.length > 0) {
            student.installments.forEach(installment => {
                if (!installment.paid) {
                    pendingInstallments.push({
                        studentId: student.id,
                        name: student.name,
                        phone: student.phone,
                        amount: installment.amount,
                        dueDate: installment.dueDate,
                        status: getDueDateStatus(installment.dueDate),
                        installmentId: installment.id
                    });
                }
            });
        }
    });
    
    // Only show overdue installments
    const overdueInstallments = pendingInstallments.filter(due => due.status === 'overdue');
    
    // Sort by due date (closest first)
    overdueInstallments.sort((a, b) => parseDate(a.dueDate) - parseDate(b.dueDate));
    
    overdueInstallments.forEach(due => {
        const row = document.createElement('tr');
        
        let statusBadge = 'badge-danger'; // Only overdue shown
        row.innerHTML = `
            <td><input type="checkbox" class="reminder-checkbox" data-student-id="${due.studentId}" data-installment-id="${due.installmentId}"></td>
            <td>${due.studentId}</td>
            <td>${due.name}</td>
            <td>
                <a href="tel:${due.phone}" class="phone-link overdue">
                    ${due.phone}
                </a>
            </td>
            <td>₹${due.amount.toLocaleString()}</td>
            <td>${formatDate(due.dueDate)}</td>
            <td><span class="badge ${statusBadge}">${due.status}</span></td>
            <td class="actions">
                <button class="action-btn payment" onclick="recordPayment('${due.studentId}', '${due.installmentId}')">
                    <i class="fas fa-rupee-sign"></i>
                </button>
                <button class="action-btn edit" onclick="sendReminder('${due.studentId}', '${due.installmentId}')">
                    <i class="fas fa-bell"></i>
                </button>
            </td>
        `;
        
        pendingFeesTable.appendChild(row);
    });
    
    // Update recent payments table
    const recentPaymentsTable = document.getElementById('recentPaymentsTable').querySelector('tbody');
    recentPaymentsTable.innerHTML = '';
    
    // Sort payments by date (most recent first)
    const sortedPayments = [...payments].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Show only 10 most recent payments
    sortedPayments.slice(0, 10).forEach(payment => {
        const student = students.find(s => s.id === payment.studentId);
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${payment.id}</td>
            <td>${student ? student.name : 'Unknown'}</td>
            <td>₹${payment.amount.toLocaleString()}</td>
            <td>${formatDate(payment.date)}</td>
            <td>${payment.paymentMode}</td>
            <td>${payment.type}</td>
            <td class="actions">
                <button class="action-btn edit" onclick="viewPaymentDetails('${payment.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn delete" onclick="deletePayment('${payment.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        recentPaymentsTable.appendChild(row);
    });
}

// Add Student Modal
function showAddStudentModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'addStudentModal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const subjectCheckboxes = subjects.map(subject => `
        <div class="checkbox-container">
            <input type="checkbox" id="subject-${subject.toLowerCase()}" name="subjects" value="${subject}">
            <label for="subject-${subject.toLowerCase()}">${subject}</label>
        </div>
    `).join('');
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">Add New Student</h3>
            <span class="close">&times;</span>
        </div>
        <div class="form-container">
            <form id="addStudentForm">
                <div class="form-row">
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Student Name*</label>
                            <input type="text" class="form-control" id="studentName" required>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Student Phone</label>
                            <input type="tel" class="form-control" id="studentPhone">
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Father's Contact*</label>
                            <input type="text" class="form-control" id="fatherContact" required>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Mother's Contact*</label>
                            <input type="tel" class="form-control" id="motherContact" required>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Subjects</label>
                    <div class="checkbox-group">
                        ${subjectCheckboxes}
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Join Date*</label>
                            <input type="text" class="form-control datepicker" id="joinDate" required>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Fee Amount*</label>
                            <input type="number" class="form-control" id="feeAmount" required>
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Payment Type*</label>
                            <select class="form-control" id="paymentType" required>
                                <option value="full">Full Payment</option>
                                <option value="installment">Installments</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div id="installmentContainer" class="installment-container">
                    <div class="form-group">
                        <label class="form-label">Number of Installments</label>
                        <select class="form-control" id="installmentCount">
                            <option value="2">2 Installments</option>
                            <option value="3">3 Installments</option>
                            <option value="4">4 Installments</option>
                            <option value="5">5 Installments</option>
                            <option value="6">6 Installments</option>
                            <option value="7">7 Installments</option>
                            <option value="8">8 Installments</option>
                            <option value="9">9 Installments</option>
                            <option value="10">10 Installments</option>
                            <option value="11">11 Installments</option>
                            <option value="12">12 Installments</option>
                        </select>
                    </div>
                    
                    <div id="installmentFields"></div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Initial Payment Amount</label>
                    <input type="number" class="form-control" id="initialPayment" value="0">
                </div>
                
                <div class="form-row">
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Payment Mode</label>
                            <select class="form-control" id="paymentMode">
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cheque">Cheque</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Payment Date</label>
                            <input type="text" class="form-control datepicker" id="paymentDate">
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea class="form-control" id="notes" rows="3"></textarea>
                </div>
                
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Add Student</button>
                </div>
            </form>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Initialize datepicker
    $('.datepicker').datepicker({
        dateFormat: 'dd/mm/yy',
        changeMonth: true,
        changeYear: true
    });
    
    // Set today's date for joinDate and paymentDate
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    document.getElementById('joinDate').value = formattedDate;
    document.getElementById('paymentDate').value = formattedDate;
    
    // Show the modal
    modal.style.display = 'block';
    
    // Close the modal when clicking on the close button or outside the modal
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    });
    
    // Toggle installment container based on payment type
    const paymentType = document.getElementById('paymentType');
    const installmentContainer = document.getElementById('installmentContainer');
    
    paymentType.addEventListener('change', function() {
        if (this.value === 'installment') {
            installmentContainer.style.display = 'block';
            updateInstallmentFields();
        } else {
            installmentContainer.style.display = 'none';
        }
    });
    
    // Update installment fields when count changes
    const installmentCount = document.getElementById('installmentCount');
    installmentCount.addEventListener('change', updateInstallmentFields);
    
    function updateInstallmentFields() {
        const count = parseInt(installmentCount.value);
        const feeAmount = parseFloat(document.getElementById('feeAmount').value) || 0;
        const installmentFields = document.getElementById('installmentFields');
        installmentFields.innerHTML = '';

        // Always use parseDate for joinDate
        const joinDateStr = document.getElementById('joinDate').value;
        const baseDate = parseDate(joinDateStr);

        const installmentAmount = Math.round(feeAmount / count);

        for (let i = 0; i < count; i++) {
            const installmentGroup = document.createElement('div');
            installmentGroup.className = 'installment-group';

            const dueDate = new Date(baseDate);
            dueDate.setMonth(dueDate.getMonth() + i);

            installmentGroup.innerHTML = `
                <div class="form-row">
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Installment ${i+1} Amount</label>
                            <input type="number" class="form-control installment-amount" value="${i === count-1 ? feeAmount - (installmentAmount * (count-1)) : installmentAmount}" data-index="${i}">
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Due Date</label>
                            <input type="text" class="form-control datepicker installment-date" value="${formatDate(dueDate)}" data-index="${i}">
                        </div>
                    </div>
                </div>
            `;
            
            installmentFields.appendChild(installmentGroup);
        }
        
        // Re-initialize datepickers for the new fields
        $('.installment-date').datepicker({
            dateFormat: 'dd/mm/yy',
            changeMonth: true,
            changeYear: true
        });
    }
    
    // Fee amount change should update installment amounts
    document.getElementById('feeAmount').addEventListener('change', function() {
        if (paymentType.value === 'installment') {
            updateInstallmentFields();
        }
    });
    
    // Form submission
    const addStudentForm = document.getElementById('addStudentForm');
    addStudentForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const studentId = generateStudentId();
        const name = document.getElementById('studentName').value;
        const phone = document.getElementById('studentPhone').value;
        const fatherContact = document.getElementById('fatherContact').value;
        const motherContact = document.getElementById('motherContact').value;
        
        // Get selected subjects
        const selectedSubjects = [];
        document.querySelectorAll('input[name="subjects"]:checked').forEach(checkbox => {
            selectedSubjects.push(checkbox.value);
        });
        
        const joinDate = document.getElementById('joinDate').value;
        const feeAmount = parseFloat(document.getElementById('feeAmount').value);
        const paymentTypeValue = document.getElementById('paymentType').value;
        const notes = document.getElementById('notes').value;
        
        // Create new student object
        const newStudent = {
            id: studentId,
            name: name,
            phone: phone,
            fatherContact: fatherContact,
            motherContact: motherContact,
            subjects: selectedSubjects,
            joinDate: joinDate,
            totalFee: feeAmount,
            notes: notes,
            installments: []
        };
        
        // Handle installments
        if (paymentTypeValue === 'installment') {
            const count = parseInt(installmentCount.value);
            
            for (let i = 0; i < count; i++) {
                const amount = parseFloat(document.querySelector(`.installment-amount[data-index="${i}"]`).value);
                const dueDate = document.querySelector(`.installment-date[data-index="${i}"]`).value;
                
                newStudent.installments.push({
                    id: `INST-${studentId}-${i+1}`,
                    amount: amount,
                    dueDate: dueDate,
                    paid: false
                });
            }
        } else {
            // Full payment - create a single installment marked as paid if initialPayment equals feeAmount
            const initialPayment = parseFloat(document.getElementById('initialPayment').value) || 0;
            newStudent.installments.push({
                id: `INST-${studentId}-1`,
                amount: feeAmount,
                dueDate: joinDate,
                paid: initialPayment >= feeAmount
            });
        }
        
        // Add student to the database
        students.push(newStudent);
        
        // Record the initial payment if any
        const initialPayment = parseFloat(document.getElementById('initialPayment').value) || 0;
        if (initialPayment > 0) {
            const paymentMode = document.getElementById('paymentMode').value;
            const paymentDate = document.getElementById('paymentDate').value;
            
            const newPayment = {
                id: generatePaymentId(),
                studentId: studentId,
                amount: initialPayment,
                date: paymentDate,
                paymentMode: paymentMode,
                type: 'Initial Payment',
                notes: 'Initial payment at enrollment'
            };
            
            payments.push(newPayment);
            
            // Update installment status if the initial payment covers any installments
            let remainingPayment = initialPayment;
            for (let i = 0; i < newStudent.installments.length; i++) {
                if (remainingPayment >= newStudent.installments[i].amount) {
                    newStudent.installments[i].paid = true;
                    remainingPayment -= newStudent.installments[i].amount;
                } else {
                    break;
                }
            }
        }
        
        // Save data
        saveData();
        
        // Close modal
        document.getElementById('addStudentModal').remove();
        
        // Update UI
        updateDashboard();
        updateStudentsTable();
        showToast('success', 'Success', 'Student added successfully');
    });
}

// Edit Student
function editStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editStudentModal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const subjectCheckboxes = subjects.map(subject => `
        <div class="checkbox-container">
            <input type="checkbox" id="edit-subject-${subject.toLowerCase()}" name="subjects" value="${subject}" ${student.subjects && student.subjects.includes(subject) ? 'checked' : ''}>
            <label for="edit-subject-${subject.toLowerCase()}">${subject}</label>
        </div>
    `).join('');
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">Edit Student (ID: ${student.id})</h3>
            <span class="close">&times;</span>
        </div>
        <div class="form-container">
            <form id="editStudentForm">
                <div class="form-row">
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Student Name*</label>
                            <input type="text" class="form-control" id="editStudentName" value="${student.name}" required>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Student Phone*</label>
                            <input type="tel" class="form-control" id="editStudentPhone" value="${student.phone}" required>
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Father's Contact</label>
                            <input type="text" class="form-control" id="editFatherContact" value="${student.fatherContact || ''}">
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Mother's Contact</label>
                            <input type="tel" class="form-control" id="editMotherContact" value="${student.motherContact || ''}">
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Subjects</label>
                    <div class="checkbox-group">
                        ${subjectCheckboxes}
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Join Date*</label>
                            <input type="text" class="form-control datepicker" id="editJoinDate" value="${formatDate(student.joinDate)}" required>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea class="form-control" id="editNotes" rows="3">${student.notes || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Update Student</button>
                </div>
            </form>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Initialize datepicker
    $('.datepicker').datepicker({
        dateFormat: 'dd/mm/yy',
        changeMonth: true,
        changeYear: true
    });
    
    // Show the modal
    modal.style.display = 'block';
    
    // Close the modal when clicking on the close button or outside the modal
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    });
    
    // Form submission
    const editStudentForm = document.getElementById('editStudentForm');
    editStudentForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Update student data
        student.name = document.getElementById('editStudentName').value;
        student.phone = document.getElementById('editStudentPhone').value;
        student.fatherContact = document.getElementById('editFatherContact').value;
        student.motherContact = document.getElementById('editMotherContact').value;
       // student.address = document.getElementById('editAddress').value;
        
        // Get selected subjects
        student.subjects = [];
        document.querySelectorAll('input[name="subjects"]:checked').forEach(checkbox => {
            student.subjects.push(checkbox.value);
        });
        
        student.joinDate = document.getElementById('editJoinDate').value;
        student.notes = document.getElementById('editNotes').value;
        
        // Save data
        saveData();
        
        // Close modal
        modal.remove();
        
        // Update UI
        updateStudentsTable();
        showToast('success', 'Success', 'Student updated successfully');
    });
}

// Delete Student
function deleteStudent(studentId) {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
        return;
    }
    
    // Remove student from the database
    const index = students.findIndex(s => s.id === studentId);
    if (index !== -1) {
        students.splice(index, 1);
    }
    
    // Remove associated payments
    const studentPayments = payments.filter(p => p.studentId === studentId);
    studentPayments.forEach(payment => {
        const paymentIndex = payments.findIndex(p => p.id === payment.id);
        if (paymentIndex !== -1) {
            payments.splice(paymentIndex, 1);
        }
    });
    
    // Save data (UI will update via saveData)
    saveData();
    
    // Update UI
    updateDashboard();
    updateStudentsTable();
    updateFeeManagement();
    showToast('success', 'Success', 'Student deleted successfully');
}

// View Student Payments
function viewPayments(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'viewPaymentsModal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Get student payments
    const studentPayments = payments.filter(p => p.studentId === studentId);
    
    // Get installment status
    const installmentRows = student.installments ? student.installments.map((inst, index) => {
        let statusBadge = 'badge-success';
        let statusText = 'Paid';
        
        if (!inst.paid) {
            const status = getDueDateStatus(inst.dueDate);
            if (status === 'overdue') {
                statusBadge = 'badge-danger';
                statusText = 'Overdue';
            } else {
                statusBadge = 'badge-info';
                statusText = 'Pending';
            }
        }
        
        return `
            <tr>
                <td>Installment ${index + 1}</td>
                <td>₹${inst.amount.toLocaleString()}</td>
                <td>${formatDate(inst.dueDate)}</td>
                <td><span class="badge ${statusBadge}">${statusText}</span></td>
                <td class="actions">
                    ${!inst.paid ? `
                        <button class="action-btn payment" onclick="recordPayment('${studentId}', '${inst.id}')">
                            <i class="fas fa-rupee-sign"></i> Record Payment
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('') : '';
    
    // Format payment history
    const paymentRows = studentPayments.map(payment => `
        <tr>
            <td>${payment.id}</td>
            <td>₹${payment.amount.toLocaleString()}</td>
            <td>${formatDate(payment.date)}</td>
            <td>${payment.paymentMode}</td>
            <td>${payment.type}</td>
            <td>${payment.notes || '-'}</td>
        </tr>
    `).join('');
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">Payment Details: ${student.name} (ID: ${student.id})</h3>
            <span class="close">&times;</span>
        </div>
        <div class="payment-details-container">
            <div class="student-summary">
                <div class="student-info">
                    <p><strong>Student:</strong> ${student.name}</p>
                    <p><strong>Phone:</strong> ${student.phone}</p>
                    <p><strong>Package:</strong> ${student.package}</p>
                </div>
                <div class="fee-summary">
                    <p><strong>Total Fee:</strong> ₹${student.totalFee.toLocaleString()}</p>
                    <p><strong>Paid:</strong> ₹${studentPayments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}</p>
                    <p><strong>Balance:</strong> ₹${(student.totalFee - studentPayments.reduce((sum, payment) => sum + payment.amount, 0)).toLocaleString()}</p>
                </div>
            </div>
            
            <h4>Installment Status</h4>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Installment</th>
                            <th>Amount</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${installmentRows}
                    </tbody>
                </table>
            </div>
            
            <h4>Payment History</h4>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Payment ID</th>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Mode</th>
                            <th>Type</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentRows}
                    </tbody>
                </table>
            </div>
            
            <div class="action-buttons">
                <button class="btn btn-primary" onclick="addNewPayment('${studentId}')">
                    <i class="fas fa-plus"></i> Add New Payment
                </button>
                <button class="btn btn-secondary" onclick="printPaymentHistory('${studentId}')">
                    <i class="fas fa-print"></i> Print Payment History
                </button>
            </div>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Show the modal
    modal.style.display = 'block';
    
    // Close the modal when clicking on the close button or outside the modal
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    });
}

// Record Payment for an installment
function recordPayment(studentId, installmentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const installment = student.installments.find(inst => inst.id === installmentId);
    if (!installment) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'recordPaymentModal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">Record Payment for ${student.name}</h3>
            <span class="close">&times;</span>
        </div>
        <div class="form-container">
            <form id="recordPaymentForm">
                <div class="form-group">
                    <label class="form-label">Student</label>
                    <input type="text" class="form-control" value="${student.name}" disabled>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Installment</label>
                    <input type="text" class="form-control" value="₹${installment.amount.toLocaleString()} (Due: ${formatDate(installment.dueDate)})" disabled>
                </div>
                
                <div class="form-row">
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Amount*</label>
                            <input type="number" class="form-control" id="paymentAmount" value="${installment.amount}" required>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Payment Date*</label>
                            <input type="text" class="form-control datepicker" id="paymentDate" required>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Payment Mode*</label>
                    <select class="form-control" id="paymentMode" required>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea class="form-control" id="paymentNotes" rows="3"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Send Payment Confirmation</label>
                    <div class="checkbox-container">
                        <input type="checkbox" id="sendConfirmation" checked>
                        <label for="sendConfirmation">Send confirmation message to parent</label>
                    </div>
                </div>
                
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Record Payment</button>
                </div>
            </form>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Initialize datepicker
    $('.datepicker').datepicker({
        dateFormat: 'dd/mm/yy',
        changeMonth: true,
        changeYear: true
    });
    
    // Set today's date for paymentDate
    const today = new Date();
    const formattedDate = formatDate(today);
    document.getElementById('paymentDate').value = formattedDate;
    
    // Show the modal
    modal.style.display = 'block';
    
    // Close the modal when clicking on the close button or outside the modal
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    });
    
    // Form submission
    const recordPaymentForm = document.getElementById('recordPaymentForm');
    recordPaymentForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const paymentDate = document.getElementById('paymentDate').value;
        const paymentMode = document.getElementById('paymentMode').value;
        const notes = document.getElementById('paymentNotes').value;
        const sendConfirmation = document.getElementById('sendConfirmation').checked;
        
        // Create new payment record
        const newPayment = {
            id: generatePaymentId(),
            studentId: studentId,
            installmentId: installmentId,
            amount: amount,
            date: paymentDate,
            paymentMode: paymentMode,
            type: 'Installment Payment',
            notes: notes
        };
        
        // Add payment to the database
        payments.push(newPayment);
        
        // --- Modified logic for partial payments ---
        if (amount >= installment.amount) {
    // Full payment or overpayment
    if (!installment.originalAmount) {
        installment.originalAmount = installment.amount;
    }
    installment.paid = true;
    installment.amount = 0;
} else {
    if (!installment.originalAmount) {
        installment.originalAmount = installment.amount;
    }
    // Partial payment
    installment.amount = parseFloat((installment.amount - amount).toFixed(2));
    installment.paid = false;
}
        // Save data
        saveData();
        
        // Send confirmation message if requested
        if (sendConfirmation) {
            const phone = student.parentPhone || student.phone;
            if (phone) {
                const message = `Dear parent, we have received the payment of ₹${amount.toLocaleString()} for ${student.name}. Thank you!`;
                const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            }
        }
        
        // Close modal
        modal.remove();
        
        // Update UI
        updateDashboard();
        updateStudentsTable();
        updateFeeManagement();
        showToast('success', 'Success', 'Payment recorded successfully');
        
        // Refresh payment view if open
        const paymentModal = document.getElementById('viewPaymentsModal');
        if (paymentModal) {
            paymentModal.remove();
            viewPayments(studentId);
        }
    });
}

// Add new payment (not linked to a specific installment)
function addNewPayment(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'addPaymentModal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">Add New Payment for ${student.name}</h3>
            <span class="close">&times;</span>
        </div>
        <div class="form-container">
            <form id="addPaymentForm">
                <div class="form-group">
                    <label class="form-label">Student</label>
                    <input type="text" class="form-control" value="${student.name}" disabled>
                </div>
                
                <div class="form-row">
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Amount*</label>
                            <input type="number" class="form-control" id="paymentAmount" required>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Payment Date*</label>
                            <input type="text" class="form-control datepicker" id="paymentDate" required>
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Payment Mode*</label>
                            <select class="form-control" id="paymentMode" required>
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cheque">Cheque</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="form-group">
                            <label class="form-label">Payment Type*</label>
                            <select class="form-control" id="paymentType" required>
                                <option value="Regular Payment">Regular Payment</option>
                                <option value="Additional Fee">Additional Fee</option>
                                <option value="Late Fee">Late Fee</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea class="form-control" id="paymentNotes" rows="3"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Apply to Installments</label>
                    <div class="checkbox-container">
                        <input type="checkbox" id="applyToInstallments" checked>
                        <label for="applyToInstallments">Automatically mark installments as paid</label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Send Payment Confirmation</label>
                    <div class="checkbox-container">
                        <input type="checkbox" id="sendConfirmation" checked>
                        <label for="sendConfirmation">Send confirmation message to parent</label>
                    </div>
                </div>
                
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Add Payment</button>
                </div>
            </form>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Initialize datepicker
    $('.datepicker').datepicker({
        dateFormat: 'dd/mm/yy',
        changeMonth: true,
        changeYear: true
    });
    
    // Set today's date for paymentDate
    const today = new Date();
    const formattedDate = formatDate(today);
    document.getElementById('paymentDate').value = formattedDate;
    
    // Show the modal
    modal.style.display = 'block';
    
    // Close the modal when clicking on the close button or outside the modal
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    });
    
    // Form submission
    const addPaymentForm = document.getElementById('addPaymentForm');
    addPaymentForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const paymentDate = document.getElementById('paymentDate').value;
        const paymentMode = document.getElementById('paymentMode').value;
        const paymentType = document.getElementById('paymentType').value;
        const notes = document.getElementById('paymentNotes').value;
        const applyToInstallments = document.getElementById('applyToInstallments').checked;
        const sendConfirmation = document.getElementById('sendConfirmation').checked;
        
        // Create new payment record
        const newPayment = {
            id: generatePaymentId(),
            studentId: studentId,
            amount: amount,
            date: paymentDate,
            paymentMode: paymentMode,
            type: paymentType,
            notes: notes
        };
        
        // Add payment to the database
        payments.push(newPayment);
        
        // Apply to installments if requested
        if (applyToInstallments && student.installments) {
            let remainingAmount = amount;
            for (let i = 0; i < student.installments.length; i++) {
                if (!student.installments[i].paid && remainingAmount >= student.installments[i].amount) {
                    student.installments[i].paid = true;
                    newPayment.installmentId = student.installments[i].id;
                    remainingAmount -= student.installments[i].amount;
                }
                
                if (remainingAmount <= 0) break;
            }
        }
        
        // Save data
        saveData();
        
        // Send confirmation message if requested
        if (sendConfirmation) {
            const phone = student.parentPhone || student.phone;
            if (phone) {
                const message = `Dear parent, we have received the payment of ₹${amount.toLocaleString()} for ${student.name}. Thank you!`;
                const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            }
        }
        
        // Close modal
        modal.remove();
        
        // Update UI
        updateDashboard();
        updateStudentsTable();
        updateFeeManagement();
        showToast('success', 'Success', 'Payment added successfully');
        
        // Refresh payment view if open
        const paymentModal = document.getElementById('viewPaymentsModal');
        if (paymentModal) {
            paymentModal.remove();
            viewPayments(studentId);
        }
    });
}

// View payment details
function viewPaymentDetails(paymentId) {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;
    
    const student = students.find(s => s.id === payment.studentId);
    if (!student) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'viewPaymentDetailsModal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">Payment Details</h3>
            <span class="close">&times;</span>
        </div>
        <div class="form-container">
            <div class="form-row">
                <div class="form-col">
                    <div class="form-group">
                        <label class="form-label">Payment ID</label>
                        <input type="text" class="form-control" value="${payment.id}" disabled>
                    </div>
                </div>
                <div class="form-col">
                    <div class="form-group">
                        <label class="form-label">Student Name</label>
                        <input type="text" class="form-control" value="${student.name}" disabled>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-col">
                    <div class="form-group">
                        <label class="form-label">Amount</label>
                        <input type="text" class="form-control" value="₹${payment.amount.toLocaleString()}" disabled>
                    </div>
                </div>
                <div class="form-col">
                    <div class="form-group">
                        <label class="form-label">Date</label>
                        <input type="text" class="form-control" value="${formatDate(payment.date)}" disabled>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-col">
                    <div class="form-group">
                        <label class="form-label">Payment Mode</label>
                        <input type="text" class="form-control" value="${payment.paymentMode}" disabled>
                    </div>
                </div>
                <div class="form-col">
                    <div class="form-group">
                        <label class="form-label">Payment Type</label>
                        <input type="text" class="form-control" value="${payment.type}" disabled>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Notes</label>
                <textarea class="form-control" disabled>${payment.notes || ''}</textarea>
            </div>
            
            <div class="form-group">
                <button class="btn btn-primary" onclick="printReceipt('${payment.id}')">
                    <i class="fas fa-print"></i> Print Receipt
                </button>
            </div>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Show the modal
    modal.style.display = 'block';
    
    // Close the modal when clicking on the close button or outside the modal
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    });
}

// Delete payment record
function deletePayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) {
        return;
    }
    
    const index = payments.findIndex(p => p.id === paymentId);
    if (index === -1) return;
    
    const payment = payments[index];
    
    // If this payment was for an installment, mark it as unpaid
    const student = students.find(s => s.id === payment.studentId);
    if (student && payment.installmentId) {
    const installment = student.installments.find(i => i.id === payment.installmentId);
    if (installment) {
        installment.paid = false;
        // Restore the original amount if available
        if (installment.originalAmount) {
            installment.amount = installment.originalAmount;
        }
    }
}
    
    // Remove the payment
    payments.splice(index, 1);
    
    // Save data (UI will update via saveData)
    saveData();
    
    // Update UI
    updateDashboard();
    updateStudentsTable();
    updateFeeManagement();
    showToast('success', 'Success', 'Payment record deleted successfully');
}

// Print receipt
function printReceipt(paymentId) {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;
    
    const student = students.find(s => s.id === payment.studentId);
    if (!student) return;
    
    const receiptWindow = window.open('', '_blank');
    
    receiptWindow.document.write(`
        <html>
        <head>
            <title>Payment Receipt</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .receipt { max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; }
                .details { margin-bottom: 30px; }
                .row { display: flex; margin-bottom: 10px; }
                .label { font-weight: bold; width: 150px; }
                .value { flex: 1; }
                .footer { margin-top: 50px; text-align: center; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h2>Payment Receipt</h2>
                    <p>Institution Name</p>
                </div>
                
                <div class="details">
                    <div class="row">
                        <div class="label">Receipt No:</div>
                        <div class="value">${payment.id}</div>
                    </div>
                    <div class="row">
                        <div class="label">Date:</div>
                        <div class="value">${formatDate(payment.date)}</div>
                    </div>
                    <div class="row">
                        <div class="label">Student ID:</div>
                        <div class="value">${student.id}</div>
                    </div>
                    <div class="row">
                        <div class="label">Student Name:</div>
                        <div class="value">${student.name}</div>
                    </div>
                    <div class="row">
                        <div class="label">Amount:</div>
                        <div class="value">₹${payment.amount.toLocaleString()}</div>
                    </div>
                    <div class="row">
                        <div class="label">Payment Mode:</div>
                        <div class="value">${payment.paymentMode}</div>
                    </div>
                    <div class="row">
                        <div class="label">Payment Type:</div>
                        <div class="value">${payment.type}</div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Thank you for your payment!</p>
                </div>
            </div>
        </body>
        </html>
    `);
    
    receiptWindow.document.close();
    receiptWindow.print();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the system
    updateDashboard();
    updateStudentsTable();
    updateFeeManagement();
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and sections
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const sectionId = this.dataset.section;
            document.getElementById(sectionId).classList.add('active');
        });
    });
    
    // Mobile menu toggle
    document.getElementById('sidebarToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('active');
    });
    
    // Add Student button
    document.getElementById('addStudentBtn').addEventListener('click', showAddStudentModal);
    
    // Send Reminders button
    document.getElementById('sendRemindersBtn').addEventListener('click', function() {
        const selectedCheckboxes = document.querySelectorAll('.reminder-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            showToast('warning', 'Warning', 'Please select at least one student to send reminders');
            return;
        }
        
        selectedCheckboxes.forEach(checkbox => {
            const studentId = checkbox.dataset.studentId;
            const installmentId = checkbox.dataset.installmentId;
            sendReminder(studentId, installmentId);
        });
    });
    
    // Select all pending checkboxes
    document.getElementById('selectAllPending').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.reminder-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });
    
    // Search functionality
    document.getElementById('dashboardSearch').addEventListener('input', function() {
        // Implement dashboard search
    });
    
    document.getElementById('studentSearch').addEventListener('input', function() {
        const searchTerm = this.value.trim();
        const tbody = document.getElementById('studentsTable').querySelector('tbody');
        const rows = tbody.getElementsByTagName('tr');
        
        for (let row of rows) {
            const studentData = row.textContent.toLowerCase();
            row.style.display = fuzzySearch(studentData, searchTerm) ? '' : 'none';
        }
    });
    
    document.getElementById('feeSearch').addEventListener('input', function() {
        // Implement fee search
    });
    
    // Save settings
    document.getElementById('saveSettings').addEventListener('click', function() {
        // Implement settings save
        showToast('success', 'Success', 'Settings saved successfully');
    });
    
    // Backup database
    document.getElementById('backupDatabase').addEventListener('click', function() {
        const data = {
            students: students,
            payments: payments
        };
        
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    // Restore database
    document.getElementById('restoreDatabase').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (data.students && data.payments) {
                    students = data.students;
                    payments = data.payments;
                    saveData();
                    // UI will update via saveData
                    showToast('success', 'Success', 'Database restored successfully');
                }
            } catch (error) {
                showToast('error', 'Error', 'Invalid backup file');
            }
        };
        reader.readAsText(file);
    });
    
    // Add data validation to student phone numbers
    function validatePhone(phone) {
        const phoneRegex = /^\d{10}$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    }
    
    // Add autosave functionality
    let autosaveTimeout;
    function setupAutosave() {
        clearTimeout(autosaveTimeout);
        autosaveTimeout = setTimeout(() => {
            saveData();
            showToast('info', 'Autosave', 'Data automatically saved');
        }, 30000); // Autosave every 30 seconds after changes
    }
    
    // Enhance search functionality with fuzzy search
    function fuzzySearch(text, search) {
        return text.toLowerCase().includes(search.toLowerCase());
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'n') { // Ctrl + N for new student
            e.preventDefault();
            showAddStudentModal();
        }
        // Add more shortcuts as needed
    });
});

// Send reminder
function sendReminder(studentId, installmentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const installment = student.installments.find(i => i.id === installmentId);
    if (!installment) return;

    // Collect all contacts with labels
    const contacts = [];
    if (student.fatherContact) contacts.push({ label: "Father", phone: student.fatherContact });
    if (student.motherContact) contacts.push({ label: "Mother", phone: student.motherContact });
    if (student.phone) contacts.push({ label: "Student", phone: student.phone });

    if (contacts.length === 0) {
        showToast('error', 'Error', 'No contact number available for this student');
        return;
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'selectContactModal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">Select Contact for WhatsApp Reminder</h3>
            <span class="close" style="cursor:pointer;">&times;</span>
        </div>
        <form id="contactSelectForm">
            <div class="form-group">
                ${contacts.map((c, idx) => `
                    <div>
                        <input type="radio" id="contact${idx}" name="contact" value="${idx}" ${idx === 0 ? 'checked' : ''}>
                        <label for="contact${idx}">${c.label}: ${c.phone}</label>
                    </div>
                `).join('')}
            </div>
            <div class="form-group" style="margin-top:16px;">
                <button type="submit" class="btn btn-primary">Send Reminder</button>
                <button type="button" class="btn btn-secondary" id="cancelContactSelect">Cancel</button>
            </div>
        </form>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Close modal logic
    modal.querySelector('.close').onclick = () => modal.remove();
    document.getElementById('cancelContactSelect').onclick = () => modal.remove();
    window.onclick = (event) => {
        if (event.target === modal) modal.remove();
    };

    // Handle form submit
    document.getElementById('contactSelectForm').onsubmit = function(e) {
        e.preventDefault();
        const idx = parseInt(document.querySelector('input[name="contact"]:checked').value, 10);
        const phone = contacts[idx].phone;
        const message = `Dear parent, this is a reminder that a payment of ₹${installment.amount.toLocaleString()} is due on ${formatDate(parseDate(installment.dueDate))} for ${student.name}. Please make the payment at your earliest convenience.`;
        const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        modal.remove();
        showToast('success', 'Success', 'Reminder sent successfully');
    };
}
