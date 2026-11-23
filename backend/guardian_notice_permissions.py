"""Describe collection-scoped MongoDB roles for the two notice processes."""
import argparse
import json


def role_definitions(database: str):
    def privilege(collection, actions):
        return {"resource": {"db": database, "collection": collection}, "actions": actions}

    queue = "guardian_notice_dispatch"
    return [
        {"createRole": "guardianNoticeRelay", "roles": [], "privileges": [
            privilege("guardian_missions", ["find", "update", "createIndex"]),
            privilege(queue, ["find", "insert", "update", "createIndex"]),
            privilege("guardian_notice_relay_health", ["insert", "update"]),
        ]},
        {"createRole": "guardianNoticeConsumer", "roles": [], "privileges": [
            privilege(queue, ["find", "update", "createIndex"]),
            privilege("guardian_inbox", ["find", "insert", "update", "createIndex"]),
            privilege("guardian_notice_consumer_health", ["insert", "update"]),
        ]},
    ]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database")
    print(json.dumps(role_definitions(parser.parse_args().database), indent=2))
