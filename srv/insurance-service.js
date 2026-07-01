module.exports = async (srv) => {
    srv.after('READ', 'PolicyApplications', (applications) => {
        for (const app of applications) {
            if (!app.status) {
                app.status = 'pending'
            }
        }
    });
};
