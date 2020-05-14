import {observer}                                      from 'mobx-react';
import {Component, h}                                  from 'preact';
import {AvailableSettings, pushNotification, settings} from '../../../../state';
import {bind, cn}                                      from '../../../../utils/preact-utils';
import {Switch}                                        from '../../../components/Switch';
import {Toast}                                         from '../../../overlays/Toast';
import baseStyles                                      from './_base.module.scss';
import styles                                          from './Notifications.module.scss';

@observer
export class Notifications extends Component {

    option(key: keyof AvailableSettings) {
        return (newValue: boolean) => {
            settings.set(key, newValue);
        };
    }

    @bind
    toggle() {

        // TODO: What if the user removed permissions during runtime?
        const state = settings.get('notifications');
        if (state === true) {
            settings.set('notifications', false);
        } else if (state === false) {
            const granted = Notification.permission === 'granted';
            settings.set('notifications', granted ? true : 'intermediate');

            if (!granted) {

                // Request permissions
                Notification.requestPermission().then(status => {
                    settings.set('notifications', status === 'granted');
                });
            }
        }
    }

    @bind
    testNotifications() {
        const success = pushNotification({
            title: 'Hello World!',
            body: 'Now go and share a file :)'
        });

        if (!success) {
            Toast.instance.set({
                text: 'Failed to show Notification',
                type: 'error'
            });
        }
    }

    render() {
        const notify = settings.get('notifications');

        // TODO: Clean up base-styles mess
        // TODO: span::before -> separator!
        return (
            <div className={cn(baseStyles.section, styles.notifications, {
                [styles.enabled]: notify === true
            })}>

                <section className={baseStyles.standalone}>
                    <header>
                        <bc-icon name="notification"/>
                        <h3>Turn on Notifications</h3>
                        <Switch state={notify}
                                onChange={this.toggle}/>
                    </header>
                </section>

                <section className={cn(styles.optionsHeader, baseStyles.borderless)}>
                    <h3>Customize</h3>

                    <button onClick={this.testNotifications}>Test</button>
                </section>

                <section className={cn(styles.options, baseStyles.borderless)}>

                    <div>
                        <h3>When someone requests a file.</h3>
                        <Switch state={settings.get('notifyOnRequest')}
                                onChange={this.option('notifyOnRequest')}/>
                    </div>

                    <div>
                        <h3>When a upload has begun.</h3>
                        <Switch state={settings.get('notifyOnUpload')}
                                onChange={this.option('notifyOnUpload')}/>
                    </div>

                    <div>
                        <h3>Connection lost / re-established</h3>
                        <Switch state={settings.get('notifyOnConnectionChange')}
                                onChange={this.option('notifyOnConnectionChange')}/>
                    </div>

                </section>
            </div>
        );
    }
}
