module.exports = async (srv) => {
    const bpApi = await cds.connect.to('API_BUSINESS_PARTNER');

    bpApi.before('*', (req) => {
        req.headers ??= {};
        req.headers['APIKey'] = process.env.BP_API_KEY;
    });

    srv.on('READ', 'BusinessPartners', async (req) => {
        return bpApi.run(req.query);
    });
};
