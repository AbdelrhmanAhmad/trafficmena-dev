import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  renderTemplate,
  TemplateRenderError,
  type RenderableTemplate,
} from '../../server/src/services/notifications/templateRender.ts';

const baseTemplate = (): RenderableTemplate => ({
  subjectEn: 'Hello {{userName}}',
  subjectAr: 'مرحبا {{userName}}',
  bodyHtmlEn: '<p>Welcome {{userName}}</p>',
  bodyHtmlAr: '<p>أهلا {{userName}}</p>',
  bodyTextEn: 'Welcome {{userName}}',
  bodyTextAr: 'أهلا {{userName}}',
  allowedVariables: ['userName'],
});

describe('notification template render', () => {
  it('renders English content by default', () => {
    const rendered = renderTemplate(baseTemplate(), 'en', { userName: 'Ada' });
    assert.equal(rendered.subject, 'Hello Ada');
    assert.equal(rendered.text, 'Welcome Ada');
    assert.match(rendered.html, /Welcome Ada/);
  });

  it('renders Arabic content when locale is ar', () => {
    const rendered = renderTemplate(baseTemplate(), 'ar', { userName: 'سارة' });
    assert.equal(rendered.subject, 'مرحبا سارة');
    assert.equal(rendered.text, 'أهلا سارة');
    assert.match(rendered.html, /أهلا سارة/);
  });

  it('substitutes allowlisted variables', () => {
    const template: RenderableTemplate = {
      ...baseTemplate(),
      subjectEn: 'Event {{eventTitle}} for {{userName}}',
      bodyHtmlEn: '<p>{{eventTitle}}</p>',
      bodyTextEn: '{{eventTitle}}',
      allowedVariables: ['userName', 'eventTitle'],
    };
    const rendered = renderTemplate(template, 'en', {
      userName: 'Ada',
      eventTitle: 'Growth Lab',
    });
    assert.equal(rendered.subject, 'Event Growth Lab for Ada');
    assert.equal(rendered.text, 'Growth Lab');
  });

  it('throws when a required variable is missing', () => {
    assert.throws(
      () => renderTemplate(baseTemplate(), 'en', {}),
      (error: unknown) => {
        assert.ok(error instanceof TemplateRenderError);
        assert.deepEqual(error.missingVariables, ['userName']);
        return true;
      },
    );
  });

  it('strips script tags from HTML output', () => {
    const template: RenderableTemplate = {
      ...baseTemplate(),
      bodyHtmlEn: '<p>Hi {{userName}}</p><script>alert(1)</script>',
      allowedVariables: ['userName'],
    };
    const rendered = renderTemplate(template, 'en', { userName: 'Ada' });
    assert.ok(!rendered.html.includes('<script'));
    assert.ok(!rendered.html.includes('alert(1)'));
    assert.match(rendered.html, /Hi Ada/);
  });
});
