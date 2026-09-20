import 'package:built_collection/built_collection.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:ssot_api_client/ssot_api_client.dart';
import 'package:ssot_mobile/api/api_client_provider.dart';
import 'package:ssot_mobile/screens/contact_detail_screen.dart';
import 'package:ssot_mobile/screens/contacts_list_screen.dart';

import '../test_utils.dart';

class _MockContactsApi extends Mock implements ContactsApi {}

final _contactFixture = ContactSummaryResponse((b) => b
  ..id = '11111111-1111-1111-1111-111111111111'
  ..displayName = 'Ada Lovelace'
  ..company = 'Analytical Engines'
  ..primaryEmail = 'ada@example.com'
  ..primaryPhone = '+34600000000');

Response<ListContactsResponse> _listResponse(ListContactsResponse data) => Response(
      requestOptions: RequestOptions(path: '/v1/contacts'),
      data: data,
      statusCode: 200,
    );

void main() {
  setUpAll(() {
    registerFallbackValue(RequestOptions(path: '/v1/contacts'));
  });

  testWidgets('UC-11: muestra los contactos devueltos por la API', (tester) async {
    final api = _MockContactsApi();
    when(() => api.contactsControllerList(
          searchTerm: any(named: 'searchTerm'),
          cursor: any(named: 'cursor'),
          limit: any(named: 'limit'),
        )).thenAnswer(
      (_) async => _listResponse(ListContactsResponse((b) => b
        ..items = ListBuilder([_contactFixture])
        ..nextCursor = null)),
    );

    await pumpRoutes(
      tester,
      routes: [
        GoRoute(path: '/contacts', builder: (context, state) => const ContactsListScreen()),
        GoRoute(
          path: '/contacts/:id',
          builder: (context, state) => ContactDetailScreen(contactId: state.pathParameters['id']!),
        ),
        GoRoute(path: '/contacts/new', builder: (context, state) => const _StubScreen()),
      ],
      initialLocation: '/contacts',
      wrap: (child) => ProviderScope(overrides: [contactsApiProvider.overrideWithValue(api)], child: child),
    );

    expect(find.text('Ada Lovelace'), findsOneWidget);
    expect(find.textContaining('Analytical Engines'), findsOneWidget);
  });

  testWidgets('cumple las guías de accesibilidad de objetivos táctiles etiquetados', (tester) async {
    final api = _MockContactsApi();
    when(() => api.contactsControllerList(
          searchTerm: any(named: 'searchTerm'),
          cursor: any(named: 'cursor'),
          limit: any(named: 'limit'),
        )).thenAnswer(
      (_) async => _listResponse(ListContactsResponse((b) => b
        ..items = ListBuilder([_contactFixture])
        ..nextCursor = null)),
    );

    final handle = tester.ensureSemantics();

    await pumpRoutes(
      tester,
      routes: [
        GoRoute(path: '/contacts', builder: (context, state) => const ContactsListScreen()),
        GoRoute(path: '/contacts/new', builder: (context, state) => const _StubScreen()),
      ],
      initialLocation: '/contacts',
      wrap: (child) => ProviderScope(overrides: [contactsApiProvider.overrideWithValue(api)], child: child),
    );

    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));

    handle.dispose();
  });
}

class _StubScreen extends StatelessWidget {
  const _StubScreen();

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
