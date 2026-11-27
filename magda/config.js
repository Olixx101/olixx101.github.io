// Ustawienia synchronizacji. Te wartości są PUBLICZNE — można je spokojnie wgrać na GitHuba.
// supabaseUrl i supabaseKey: Supabase → Project Settings → API (Project URL oraz anon / publishable key).
// Dopóki są puste, aplikacja działa tylko na tym urządzeniu.
window.APP_CONFIG = {
  appId: 'magda',             // unikalna nazwa tej aplikacji (inna w każdym folderze, np. 'magda')
  appTitle: 'Moje zadania',   // nagłówek w aplikacji
  supabaseUrl: '',
  supabaseKey: '',
  vapidPublicKey: 'BGaSwxNENpWTxggJaF3xGjPN4R_EyFbU3iGBKuX-mR1W8QdVhn3dCFv2BD2AbCMav6TxLJjfcMpfyKMGkRiHOBw'
};
