import json
import threading
import unittest
from functools import partial
from http.server import ThreadingHTTPServer
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import server


class LocalAPI(unittest.TestCase):
    def setUp(self):
        self.http = ThreadingHTTPServer(("127.0.0.1", 0), partial(server.Handler, directory=str(server.ROOT)))
        self.url = "http://127.0.0.1:" + str(self.http.server_port)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join()

    def post(self, body):
        return urlopen(Request(self.url + "/api/ask", json.dumps(body).encode(), {"Content-Type": "application/json"}))

    def test_rejects_empty_context(self):
        with self.assertRaises(HTTPError) as error:
            self.post({"mode": "answer", "question": "Freinage ?", "clauses": []})
        self.assertEqual(error.exception.code, 400)

    def test_official_neural_ranking_and_generation(self):
        from eu_api import corpus
        key = ["32024R1257", 0]
        fixture = corpus()[key[0]]["passages"][0]
        for route, model_result in [
            ("embed", {"embeddings": [[1, 0], [1, 0]]}),
            ("answer", {"message": {"content": "Voir [S1]."}}),
        ]:
            with self.subTest(route=route), patch("eu_api.ollama", return_value=model_result) as model:
                request = Request(self.url + "/api/eu/" + route, json.dumps({"query": "Euro 7", "keys": [key]}).encode(),
                                  {"Content-Type": "application/json"})
                with urlopen(request) as response:
                    result = json.load(response)
                if route == "embed":
                    self.assertEqual(result["scores"], [1.0])
                    self.assertIn(fixture["text"], model.call_args.args[2]["input"][1])
                else:
                    self.assertEqual(result["sources"][0]["url"], fixture["url"])
                    self.assertEqual(result["sources"][0]["text"], fixture["text"])

    def test_cited_response_preserves_sources(self):
        model = {"message": {"content": "Joindre les relevés [S1-V2]."}}
        with patch("server.urlopen", return_value=BytesIO(json.dumps(model).encode())) as call:
            with self.post({"mode": "impact", "question": "", "clauses": [
                {"title": "Essais", "before": "Joindre le rapport.", "after": "Joindre le rapport et les relevés."}
            ]}) as response:
                result = json.load(response)
            request = call.call_args.args[0]
        self.assertEqual(request.full_url, server.OLLAMA + "/api/chat")
        self.assertIn("S1-V2", result["answer"])
        self.assertEqual(result["sources"][1]["extrait"], "Joindre le rapport et les relevés.")
        self.assertIn("Joindre le rapport", json.loads(request.data)["messages"][1]["content"])
