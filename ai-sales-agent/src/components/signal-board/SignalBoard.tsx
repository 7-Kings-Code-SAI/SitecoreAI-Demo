import { LinkField, RichText, RichTextField, Text, TextField } from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';
import styles from './SignalBoard.module.css';

type SignalBoardFields = {
  eyebrow?: TextField;
  title?: TextField;
  intro?: RichTextField;
  metricOneValue?: TextField;
  metricOneLabel?: TextField;
  metricTwoValue?: TextField;
  metricTwoLabel?: TextField;
  metricThreeValue?: TextField;
  metricThreeLabel?: TextField;
  cta?: LinkField;
};

type Metric = {
  value?: TextField;
  label?: TextField;
};

const hasValue = (field?: TextField | RichTextField) => Boolean(field?.value);

const SignalBoard = (props: ComponentProps) => {
  const fields = props.rendering.fields as SignalBoardFields | undefined;
  const metrics: Metric[] = [
    { value: fields?.metricOneValue, label: fields?.metricOneLabel },
    { value: fields?.metricTwoValue, label: fields?.metricTwoLabel },
    { value: fields?.metricThreeValue, label: fields?.metricThreeLabel },
  ].filter((metric) => hasValue(metric.value) || hasValue(metric.label));
  const cta = fields?.cta?.value;

  return (
    <section className={styles.board} data-component="signal-board">
      <div className={styles.header}>
        {hasValue(fields?.eyebrow) && (
          <Text className={styles.eyebrow} field={fields?.eyebrow} tag="span" />
        )}
        {hasValue(fields?.title) && (
          <Text className={styles.title} field={fields?.title} tag="h2" />
        )}
        {hasValue(fields?.intro) && <RichText className={styles.intro} field={fields?.intro} />}
      </div>

      {metrics.length > 0 && (
        <div className={styles.metrics}>
          {metrics.map((metric, index) => (
            <div className={styles.metric} key={`${metric.label?.value ?? 'metric'}-${index}`}>
              {hasValue(metric.value) && (
                <Text className={styles.metricValue} field={metric.value} tag="p" />
              )}
              {hasValue(metric.label) && (
                <Text className={styles.metricLabel} field={metric.label} tag="p" />
              )}
            </div>
          ))}
        </div>
      )}

      {cta?.href && (
        <a
          className={styles.cta}
          href={cta.href}
          target={cta.target}
          rel={cta.target === '_blank' ? 'noreferrer' : undefined}
        >
          <span>{cta.text || 'Explore more'}</span>
          <span aria-hidden="true">↗</span>
        </a>
      )}
    </section>
  );
};

export default SignalBoard;
