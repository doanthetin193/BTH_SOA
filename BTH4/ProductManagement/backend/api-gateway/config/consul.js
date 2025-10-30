import Consul from 'consul';

const consul = new Consul({
    host: process.env.CONSUL_HOST || 'localhost',
    port: process.env.CONSUL_PORT || '8500',
    promisify: true
});

const getServiceAddress = async (serviceName) => {
    try {
        const services = await consul.health.service({
            service: serviceName,
            passing: true
        });

        if (services.length === 0) {
            throw new Error(`No healthy instances of ${serviceName} found`);
        }

        // Simple round-robin: pick first healthy instance
        const service = services[0].Service;
        return `http://${service.Address}:${service.Port}`;
    } catch (err) {
        console.error(`Error getting service ${serviceName}:`, err.message);
        throw err;
    }
};

export { getServiceAddress, consul };
