import { Http } from 'hinos-common/Http';

namespace MicroService {
    export async function checkAuthoriz(headers) {
        return await Http.head(`${AppConfig.services.auth}/authoriz`, {
            headers: headers
        });
    }
}

export default MicroService;