// Simple vanilla JS app - no framework magic
class CarApp {
    constructor() {
        this.currentPage = 'login';
        this.user = null;
        this.cars = [];
        this.loading = false;
        this.init();
    }

    init() {
        const token = localStorage.getItem('token');
        if (token) {
            this.checkAuthStatus();
        } else {
            this.showPage('login');
        }
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Add car form
        document.getElementById('add-car-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCar();
        });

        // Navigation buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-nav]')) {
                this.showPage(e.target.dataset.nav);
            }
            if (e.target.matches('[data-action="logout"]')) {
                this.logout();
            }
        });
    }

    showPage(page) {
        this.currentPage = page;
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
        // Show current page
        const currentPageEl = document.getElementById(`page-${page}`);
        if (currentPageEl) {
            currentPageEl.style.display = 'block';
        }

        // Update header
        const userInfo = document.getElementById('user-info');
        if (this.user) {
            userInfo.style.display = 'block';
            document.getElementById('username-display').textContent = this.user.username;
        } else {
            userInfo.style.display = 'none';
        }

        // Load page-specific data
        if (page === 'cars' || page === 'dashboard') {
            this.loadCars();
        }
    }

    async login() {
        this.setLoading(true);
        const formData = new FormData(document.getElementById('login-form'));
        
        try {
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.get('username'),
                    password: formData.get('password')
                })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                this.user = data.user;
                this.showPage('dashboard');
            } else {
                this.showError('Login failed');
            }
        } catch (error) {
            this.showError('Unable to connect to login service');
        } finally {
            this.setLoading(false);
        }
    }

    async loadCars() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('/api/v1/cars/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.cars = data;
                this.renderCars();
            }
        } catch (error) {
            console.error('Load cars error:', error);
        }
    }

    renderCars() {
        // Dashboard cars
        const dashboardCars = document.getElementById('dashboard-cars');
        if (dashboardCars) {
            if (this.cars.length === 0) {
                dashboardCars.innerHTML = '<p>No cars yet.</p>';
            } else {
                dashboardCars.innerHTML = this.cars.slice(0, 3)
                    .map(car => `<p>${car.name}</p>`)
                    .join('');
            }
        }

        // Cars table
        const carsTable = document.getElementById('cars-table-body');
        if (carsTable) {
            if (this.cars.length === 0) {
                document.getElementById('cars-list').style.display = 'none';
                document.getElementById('no-cars').style.display = 'block';
            } else {
                document.getElementById('cars-list').style.display = 'block';
                document.getElementById('no-cars').style.display = 'none';
                
                carsTable.innerHTML = this.cars.map(car => `
                    <tr>
                        <td data-testid="car-name">${car.name}</td>
                        <td data-testid="car-connectors">${car.connectors?.map(c => c.type?.value || c.type).join(', ') || '-'}</td>
                        <td data-testid="car-battery-limit">${car.battery_charge_limit}</td>
                        <td data-testid="car-battery-size">${car.battery_size}</td>
                        <td data-testid="car-max-kw-ac">${car.max_kw_ac}</td>
                        <td data-testid="car-max-kw-dc">${car.max_kw_dc}</td>
                    </tr>
                `).join('');
            }
        }
    }

    async addCar() {
        this.setLoading(true);
        const formData = new FormData(document.getElementById('add-car-form'));
        
        // Get checked connector types
        const connectorTypes = Array.from(document.querySelectorAll('input[name="connector_types"]:checked'))
            .map(cb => cb.value);

        const carData = {
            name: formData.get('name'),
            connector_types: connectorTypes,
            battery_charge_limit: parseInt(formData.get('battery_charge_limit')),
            battery_size: parseInt(formData.get('battery_size')),
            max_kw_ac: parseInt(formData.get('max_kw_ac')),
            max_kw_dc: parseInt(formData.get('max_kw_dc'))
        };

        try {
            const response = await fetch('/api/v1/cars/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(carData)
            });

            if (response.ok) {
                document.getElementById('add-car-form').reset();
                this.showPage('cars');
            } else {
                this.showError('Failed to add car');
            }
        } catch (error) {
            this.showError('Unable to add car');
        } finally {
            this.setLoading(false);
        }
    }

    logout() {
        localStorage.removeItem('token');
        this.user = null;
        this.cars = [];
        this.showPage('login');
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('token');
        if (!token) {
            this.showPage('login');
            return;
        }

        try {
            const response = await fetch('/api/v1/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.user = data.user;
                this.showPage('dashboard');
            } else {
                this.logout();
            }
        } catch (error) {
            this.logout();
        }
    }

    setLoading(loading) {
        this.loading = loading;
        const loadingElements = document.querySelectorAll('.loading-text');
        const submitElements = document.querySelectorAll('.submit-text');
        
        loadingElements.forEach(el => el.style.display = loading ? 'inline' : 'none');
        submitElements.forEach(el => el.style.display = loading ? 'none' : 'inline');
    }

    showError(message) {
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.carApp = new CarApp();
});