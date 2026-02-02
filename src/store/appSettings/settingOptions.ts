import { AppSettingsOptions } from '@/store/appSettings/appSettings.type';

export const appSettingOptions: AppSettingsOptions = {
    'app.region': [
        { label: 'Asia Pacific (Sydney)', value: 'ap-southeast-2' },
        { label: 'US East (N. Virginia)', value: 'us-east-1', disabled: true },
    ],
    'app.apiTiming': [
        { label: 'Off', value: 'off' },
        { label: 'On', value: 'on' },
    ],
    'app.comprehendMedicalEnabled': [
        { label: 'Enabled', value: 'enabled' },
        { label: 'Disabled', value: 'disabled' },
    ],
};
