import {h}        from 'preact';
import {cn}       from '../../../../utils/preact-utils';
import baseStyles from './_base.module.scss';
import styles     from './About.module.scss';

export const About = () => {
    const version = env.VERSION === '0.0.0' ? 'Unreleased' : env.VERSION;
    const build = new Date(env.BUILD_DATE).toUTCString();

    return (
        <div className={cn(baseStyles.section, styles.about)}>
            <header>
                <bc-icon name="shield"/>
                <h1>About</h1>
                <span> - About the Author and the project</span>
            </header>

            <section>
                <ul>
                    <li>Creator: <b>Simon Reinisch</b></li>
                    <li>Project: <a href="https://github.com/dot-cafe/beam.cafe">Repository on GitHub</a></li>
                    <li>License: <b>MIT</b></li>
                    <li>Version: <b>{version}</b></li>
                    <li>Build: <b>{build}</b></li>
                </ul>
            </section>

            <section>
                <p>Many thanks to <a href="https://icons8.com/">Icons8</a> for the Icons!</p>
            </section>
        </div>
    );
};
