// api/src/functions/GetTransactions/index.js
const { Connection, Request } = require('tedious');

module.exports = async function (context, req) {
    context.log('HTTP trigger function processed a request. (GetTransactions)');

    // Konfigurasi koneksi database dari Application Settings (atau local.settings.json)
    const config = {
        server: process.env.DB_SERVER,
        authentication: {
            type: 'default',
            options: {
                userName: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
            },
        },
        options: {
            database: process.env.DB_DATABASE,
            encrypt: true, // WAJIB true untuk Azure SQL Database
            port: parseInt(process.env.DB_PORT || 1433),
            trustServerCertificate: true // Set true untuk debugging koneksi Node.js Anda
        },
    };

    // Ini adalah bagian debugging yang sebelumnya kita tambahkan
    // Output ini akan muncul di log terminal Azure Functions Core Tools
    context.log('--- Debugging Connection Config ---');
    context.log('Config Server:', config.server, 'Type:', typeof config.server);
    context.log('Config User:', config.authentication.options.userName, 'Type:', typeof config.authentication.options.userName);
    context.log('Config Password Length:', config.authentication.options.password ? config.authentication.options.password.length : 'NOT SET');
    // Hash password agar tidak tercetak aslinya di log
    if (config.authentication.options.password) {
        context.log('Config Password Hash:', require('crypto').createHash('sha256').update(config.authentication.options.password).digest('hex'));
    } else {
        context.log('Config Password Hash: NOT SET');
    }
    context.log('Config Database:', config.options.database, 'Type:', typeof config.options.database);
    context.log('Config Port:', config.options.port, 'Type:', typeof config.options.port);
    context.log('Config Encrypt:', config.options.encrypt, 'Type:', typeof config.options.encrypt);
    context.log('Config Trust Server Cert:', config.options.trustServerCertificate, 'Type:', typeof config.options.trustServerCertificate);
    context.log('-----------------------------------');


    return new Promise((resolve, reject) => {
        const connection = new Connection(config);

        connection.on('connect', (err) => {
            if (err) {
                context.log.error('Connection Error (GetTransactions):', err.message);
                // Tambahkan detail error yang lebih spesifik
                let errorMessage = 'Database connection failed.';
                if (err.message && err.message.includes('Login failed')) {
                    errorMessage = 'Login failed for database user.';
                } else if (err.message && err.message.includes('ECONNRESET')) {
                    errorMessage = 'Connection lost unexpectedly (ECONNRESET). Check network/firewall.';
                } else if (err.message) {
                     errorMessage = err.message;
                }
                
                return resolve({ // Menggunakan resolve dengan status 500 untuk error HTTP
                    status: 500,
                    body: { error: errorMessage, details: err.message || 'No further details.' }
                });
            }
            context.log('Connected to Azure SQL Database');

            const request = new Request(
                'SELECT Id, Type, Description, Amount, Date FROM Transactions ORDER BY Date DESC',
                (err, rowCount) => {
                    if (err) {
                        context.log.error('Request Error (GetTransactions):', err.message);
                        connection.close();
                        return resolve({ // Menggunakan resolve dengan status 500 untuk error HTTP
                            status: 500,
                            body: { error: 'Failed to retrieve transactions.', details: err.message }
                        });
                    }
                    context.log(`GetTransactions: ${rowCount} rows returned`);
                    connection.close();
                }
            );

            let transactions = [];
            request.on('row', (columns) => {
                let transaction = {};
                columns.forEach((column) => {
                    // Konversi Date ke format string ISO jika perlu (YYYY-MM-DD)
                    if (column.metadata.colName === 'Date' && column.value) {
                        transaction[column.metadata.colName] = column.value.toISOString().split('T')[0];
                    } else {
                        transaction[column.metadata.colName] = column.value;
                    }
                });
                transactions.push(transaction);
            });

            request.on('doneProc', () => {
                resolve({
                    status: 200,
                    body: transactions
                });
            });

            connection.execSql(request);
        });

        connection.on('error', (err) => {
            context.log.error('Unhandled Connection Error Event (GetTransactions):', err.message);
            // Penting: Pastikan tidak memanggil resolve/reject jika sudah dipanggil di 'connect' error
            // Jika ini error yang terjadi setelah koneksi terbentuk, fungsi bisa mencoba resolve/reject
            if (connection && connection.state && connection.state.name !== 'Closed') {
                connection.close();
            }
            // Hanya reject jika response belum dikirim (tetapi di sini kita menggunakan resolve untuk error HTTP)
            if (!context.res) { 
                resolve({ // Menggunakan resolve dengan status 500 untuk error HTTP
                    status: 500,
                    body: { error: 'An unhandled database connection error occurred.', details: err.message }
                });
            }
        });

        connection.connect();
    }).then(result => {
        context.res = result; // Set context.res for success
    }).catch(errorResult => {
        context.res = errorResult; // Set context.res for error
    });
};